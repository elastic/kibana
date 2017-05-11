import _ from 'lodash';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_name';
import 'ui/directives/auto_select_if_only_one';
import { RefreshKibanaIndex } from '../refresh_kibana_index';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './create_index_pattern.html';
import { sendCreateIndexPatternRequest } from './send_create_index_pattern_request';

uiRoutes
.when('/management/kibana/index', {
  template,
});

uiModules.get('apps/management')
.controller('managementIndicesCreate', function ($scope, kbnUrl, Private, Notifier, indexPatterns, es, config, Promise, $translate) {
  const notify = new Notifier();
  const refreshKibanaIndex = Private(RefreshKibanaIndex);

  // Configure the new index pattern we're going to create.
  this.newIndexPattern = {
    name: config.get('indexPattern:placeholder'),
    expandable: false,
    timeField: null,
  };

  // UI state.
  this.dateFields = null;
  this.patternErrors = [];
  this.fetchFieldsError = $translate.instant('KIBANA-LOADING');

  const TIME_FILTER_FIELD_OPTIONS = {
    NO_DATE_FIELD_DESIRED: {
      name: $translate.instant('KIBANA-NO_DATE_FIELD_DESIRED')
    },
    NO_DATE_FIELDS_IN_INDICES: {
      name: $translate.instant('KIBANA-NO_DATE_FIELDS_IN_INDICES')
    }
  };

  const fetchFieldList = () => {
    this.dateFields = this.newIndexPattern.timeField = null;
    let fetchFieldsError;
    let dateFields;

    // we don't have enough info to continue
    if (!this.newIndexPattern.name) {
      fetchFieldsError = $translate.instant('KIBANA-SET_INDEX_NAME_FIRST');
      return;
    }

    return indexPatterns.mapper.clearCache(this.newIndexPattern.name)
    .then(() => {
      const pattern = mockIndexPattern(this.newIndexPattern.name);

      return indexPatterns.mapper.getFieldsForIndexPattern(pattern, {
        skipIndexPatternCache: true,
      })
      .catch((err) => {
        // TODO: we should probably display a message of some kind
        if (err instanceof IndexPatternMissingIndices) {
          fetchFieldsError = $translate.instant('KIBANA-INDICES_MATCH_PATTERN');
          return [];
        }

        throw err;
      });
    })
    .then(fields => {
      if (fields.length > 0) {
        fetchFieldsError = null;
        dateFields = fields.filter(field => field.type === 'date');
      }

      return {
        fetchFieldsError,
        dateFields,
      };
    }, notify.fatal);
  };

  const updateFieldList = results => {
    this.fetchFieldsError = results.fetchFieldsError;
    if (this.fetchFieldsError) {
      return;
    }

    this.dateFields = results.dateFields || [];
    this.indexHasDateFields = this.dateFields.length > 0;
    const moreThanOneDateField = this.dateFields.length > 1;
    if (this.indexHasDateFields) {
      this.dateFields.unshift(TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELD_DESIRED);
    } else {
      this.dateFields.unshift(TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELDS_IN_INDICES);
    }

    if (!moreThanOneDateField) {
      // At this point the `dateFields` array contains the date fields and the "no selection"
      // option. When we have less than two date fields we choose the last option, which will
      // be the "no date fields available" option if there are zero date fields, or the only
      // date field if there is one.
      this.newIndexPattern.timeField = this.dateFields[this.dateFields.length - 1];
    }
  };

  const updateTimeField = (dateFields, timeFieldName) => {
    if (!dateFields.length) {
      return;
    }

    const matchingTimeField = dateFields.find(field => field.name === timeFieldName);

    //assign the field from the results-list
    //angular recreates a new timefield instance, each time the list is refreshed.
    //This ensures the selected field matches one of the instances in the list.
    if (matchingTimeField) {
      this.newIndexPattern.timeField = matchingTimeField;
    }
  };

  function mockIndexPattern(indexPatternName) {
    // trick the mapper into thinking this is an indexPattern
    return {
      id: indexPatternName,
    };
  }

  this.canExpandIndices = () => {
    // to maximize performance in the digest cycle, move from the least
    // expensive operation to most
    return _.includes(this.newIndexPattern.name, '*');
  };

  this.refreshFieldList = () => {
    const timeField = this.newIndexPattern.timeField;
    const fetchFieldListPromise = fetchFieldList();

    if (!fetchFieldListPromise) return;

    fetchFieldListPromise.then(results => {
      updateFieldList(results);

      if (timeField) {
        updateTimeField(results.dateFields, timeField.name);
      }
    });
  };

  this.createIndexPattern = () => {
    const id = this.newIndexPattern.name;
    let timeFieldName;
    if ((this.newIndexPattern.timeField !== TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELD_DESIRED)
      && (this.newIndexPattern.timeField !== TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELDS_IN_INDICES)) {
      timeFieldName = this.newIndexPattern.timeField.name;
    }

    const notExpandable =
      !this.newIndexPattern.expandable && this.canExpandIndices()
      ? true
      : undefined;

    sendCreateIndexPatternRequest(indexPatterns, {
      id,
      timeFieldName,
      notExpandable,
    }).then(createdId => {
      if (!createdId) {
        return;
      }

      refreshKibanaIndex().then(() => {
        if (!config.get('defaultIndex')) {
          config.set('defaultIndex', id);
        }

        indexPatterns.cache.clear(id);
        kbnUrl.change(`/management/kibana/indices/${id}`);
      });
    }).catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return notify.error($translate.instant('KIBANA-NO_INDICES_MATCHING_PATTERN'));
      }

      notify.fatal(err);
    });
  };
});
