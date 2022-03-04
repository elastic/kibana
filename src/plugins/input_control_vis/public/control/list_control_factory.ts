/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  TimefilterContract,
  SerializedSearchSourceFields,
  DataPublicPluginStart,
} from 'src/plugins/data/public';
import { DataViewField } from '../../../data_views/public';
import { Control, noValuesDisableMsg, noIndexPatternMsg } from './control';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';
import { createSearchSource } from './create_search_source';
import { ControlParams } from '../editor_utils';
import { InputControlSettings, InputControlVisDependencies } from '../plugin';

function getEscapedQuery(query = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);
}

interface TermsAggArgs {
  field?: DataViewField;
  size: number | null;
  direction: string;
  query?: string;
}

const termsAgg = ({ field, size, direction, query }: TermsAggArgs) => {
  const terms: any = {
    order: {
      _count: direction,
    },
  };

  if (size) {
    terms.size = size < 1 ? 1 : size;
  }

  if (field?.scripted) {
    terms.script = {
      source: field.script,
      lang: field.lang,
    };
    terms.value_type = field.type === 'number' ? 'float' : field.type;
  } else {
    terms.field = field?.name;
  }

  if (query) {
    terms.include = `.*${getEscapedQuery(query)}.*`;
  }

  return {
    termsAgg: {
      terms,
    },
  };
};

export class ListControl extends Control<PhraseFilterManager> {
  private getSettings: () => Promise<InputControlSettings>;
  private timefilter: TimefilterContract;
  private searchSource: DataPublicPluginStart['search']['searchSource'];

  abortController?: AbortController;
  lastAncestorValues: any;
  lastQuery?: string;
  partialResults?: boolean;
  selectOptions?: string[];

  constructor(
    controlParams: ControlParams,
    filterManager: PhraseFilterManager,
    useTimeFilter: boolean,
    searchSource: DataPublicPluginStart['search']['searchSource'],
    deps: InputControlVisDependencies
  ) {
    super(controlParams, filterManager, useTimeFilter);
    this.getSettings = deps.getSettings;
    this.timefilter = deps.data.query.timefilter.timefilter;
    this.searchSource = searchSource;
  }

  fetch = async (query?: string) => {
    // Abort any in-progress fetch
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const indexPattern = this.filterManager.getIndexPattern();
    if (!indexPattern) {
      this.disable(noIndexPatternMsg(this.controlParams.indexPattern));
      return;
    }

    let ancestorFilters;
    if (this.hasAncestors()) {
      if (this.hasUnsetAncestor()) {
        this.disable(
          i18n.translate('inputControl.listControl.disableTooltip', {
            defaultMessage: "Disabled until '{label}' is set.",
            values: { label: this.ancestors[0].label },
          })
        );
        this.lastAncestorValues = undefined;
        return;
      }

      const ancestorValues = this.getAncestorValues();
      if (_.isEqual(ancestorValues, this.lastAncestorValues) && _.isEqual(query, this.lastQuery)) {
        // short circuit to avoid fetching options list for same ancestor values
        return;
      }
      this.lastAncestorValues = ancestorValues;
      this.lastQuery = query;

      ancestorFilters = this.getAncestorFilters();
    }

    const fieldName = this.filterManager.fieldName;
    const settings = await this.getSettings();
    const initialSearchSourceState: SerializedSearchSourceFields = {
      timeout: `${settings.autocompleteTimeout}ms`,
      terminate_after: Number(settings.autocompleteTerminateAfter),
    };

    // dynamic options are only allowed on String fields but the setting defaults to true so it could
    // be enabled for non-string fields (since UI input is hidden for non-string fields).
    // If field is not string, then disable dynamic options.
    const field = indexPattern?.fields
      .getAll()
      .find(({ name }) => name === this.controlParams.fieldName);
    if (field && field.type !== 'string') {
      this.options.dynamicOptions = false;
    }

    const aggs = termsAgg({
      field: indexPattern.fields.getByName(fieldName),
      size: this.options.dynamicOptions ? null : _.get(this.options, 'size', 5),
      direction: 'desc',
      query,
    });
    const searchSource = await createSearchSource(
      this.searchSource,
      initialSearchSourceState,
      indexPattern,
      aggs,
      this.useTimeFilter,
      ancestorFilters,
      this.timefilter
    );
    const abortSignal = this.abortController.signal;

    this.lastQuery = query;
    let resp;
    try {
      resp = await searchSource.fetch({ abortSignal });
    } catch (error) {
      // If the fetch was aborted then no need to surface this error in the UI
      if (error.name === 'AbortError') return;

      this.disable(
        i18n.translate('inputControl.listControl.unableToFetchTooltip', {
          defaultMessage: 'Unable to fetch terms, error: {errorMessage}',
          values: { errorMessage: error.message },
        })
      );
      return;
    }

    if (query && this.lastQuery !== query) {
      // search results returned out of order - ignore results from old query
      return;
    }

    const selectOptions = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket: any) => {
      return bucket?.key;
    });

    if (selectOptions.length === 0 && !query) {
      this.disable(noValuesDisableMsg(fieldName, indexPattern.title));
      return;
    }

    // TODO: terminated_early is missing from response definition.
    // https://github.com/elastic/elasticsearch-js/issues/1289
    this.partialResults = (resp as any).terminated_early || resp.timed_out;
    this.selectOptions = selectOptions;
    this.enable = true;
    this.disabledReason = '';
  };

  destroy() {
    if (this.abortController) this.abortController.abort();
  }

  hasValue() {
    return typeof this.value !== 'undefined' && this.value.length > 0;
  }
}

export async function listControlFactory(
  controlParams: ControlParams,
  useTimeFilter: boolean,
  deps: InputControlVisDependencies
) {
  const [, { data: dataPluginStart }] = await deps.core.getStartServices();

  const listControl = new ListControl(
    controlParams,
    new PhraseFilterManager(
      controlParams.id,
      controlParams.fieldName,
      controlParams.indexPattern,
      dataPluginStart.indexPatterns,
      deps.data.query.filterManager
    ),
    useTimeFilter,
    dataPluginStart.search.searchSource,
    deps
  );
  await listControl.filterManager.init();
  return listControl;
}
