import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './filter_editor.html';
import { FILTER_OPERATORS } from './lib/filter_operators';
import { buildExistsFilter, buildPhraseFilter, buildRangeFilter, buildPhrasesFilter } from '../filter_manager/lib';
import '../filters/sort_prefix_first';
import '../directives/ui_select_focus_on';
import './filter_editor.less';

const module = uiModules.get('kibana');
module.directive('filterEditor', function ($http) {
  return {
    restrict: 'E',
    template,
    scope: {
      indexPatterns: '=',
      filter: '=',
      onDelete: '&',
      onCancel: '&',
      onSave: '&'
    },
    controllerAs: 'filterEditor',
    bindToController: true,
    controller: function ($scope) {
      this.init = (filter) => {
        this.isPinned = _.get(filter, ['$state', 'store']) === 'globalState';
        this.isDisabled = filter.meta.disabled;
        this.alias = filter.meta.alias;
        this.isEditingQueryDsl = false;
        this.queryDsl = _(filter)
          .omit(['meta', '$state'])
          .cloneDeep();

        const { index, key, isNew } = filter.meta;
        if (isNew) {
          this.field = null;
          this.operator = null;
          this.params = {};
          this.setFocus('field');
        } else {
          const indexPattern = this.indexPatterns.find(({ id }) => id === index);
          this.setField(indexPattern.fields.byName[key]);
          this.setOperator(getOperatorFromFilter(filter));
          this.params = getParamsFromFilter(filter);
        }
      };

      $scope.$watch(() => this.filter, this.init);
      $scope.$watch(() => this.indexPatterns, (indexPatterns) => {
        this.fieldSuggestions = getFieldSuggestions(indexPatterns);
      });

      this.getSetField = (field) => {
        if (field) {
          return this.setField(field);
        }
        return this.field;
      };

      this.setField = (field) => {
        this.field = field;
        this.operator = null;
        this.operatorSuggestions = getOperatorSuggestions(field);
      };

      this.getSetOperator = (operator) => {
        if (operator) {
          return this.setOperator(operator);
        }
        return this.operator;
      };

      this.setOperator = (operator) => {
        this.operator = operator;
        const type = _.get(operator, 'type');
        if (type === 'phrase' || type === 'phrases') {
          this.refreshValueSuggestions();
        }
      };

      this.setFocus = (name) => {
        $scope.$broadcast(`focus-${name}`);
      };

      this.refreshValueSuggestions = (query) => {
        return getValueSuggestions(this.field, query)
          .then(suggestions => this.valueSuggestions = suggestions);
      };

      const simpleTypes = _(FILTER_OPERATORS)
        .map('type')
        .uniq()
        .value();

      this.showQueryDslEditor = () => {
        const { type, isNew } = this.filter.meta;
        return this.isEditingQueryDsl || (!isNew && !simpleTypes.includes(type));
      };

      $scope.aceLoaded = function (editor) {
        editor.$blockScrolling = Infinity;
        const session = editor.getSession();
        session.setTabSize(2);
        session.setUseSoftTabs(true);
      };

      $scope.compactUnion = _.flow(_.union, _.compact);

      this.save = () => {
        const { field, operator, params, isPinned, isDisabled, alias } = this;

        let filter;
        if (this.showQueryDslEditor()) {
          // TODO: If index isn't specified, assign it to something (what?)
          const meta = _.pick(this.filter.meta, ['negate', 'index']);
          filter = Object.assign(this.queryDsl, { meta });
        } else {
          if (operator.type === 'phrase') {
            filter = buildPhraseFilter(field, params.value, field.indexPattern);
          } else if (operator.type === 'phrases') {
            filter = buildPhrasesFilter(field, params.values, field.indexPattern);
          } else if (operator.type === 'range') {
            filter = buildRangeFilter(field, { gte: params.from, lt: params.to }, field.indexPattern);
          } else if (operator.type === 'exists') {
            filter = buildExistsFilter(field, field.indexPattern);
          }
          filter.meta.negate = operator.negate;
        }
        filter.meta.disabled = isDisabled;
        filter.meta.alias = alias;

        return this.onSave({ filter, isPinned });
      };

      function getOperatorFromFilter(filter) {
        const { type, negate } = filter.meta;
        return FILTER_OPERATORS.find((operator) => {
          return operator.type === type && operator.negate === negate;
        });
      }

      function getParamsFromFilter(filter) {
        const { type, key } = filter.meta;
        if (type === 'phrase') {
          const value = filter.query ? filter.query.match[key].query : filter.script.script.params.value;
          return { value };
        } else if (type === 'phrases') {
          return { values: filter.meta.values };
        } else if (type === 'range') {
          const params = filter.range ? filter.range[key] : filter.script.script.params;
          const from = _.has(params, 'gte') ? params.gte : params.gt;
          const to = _.has(params, 'lte') ? params.lte : params.lt;
          return { from, to };
        } else {
          return {};
        }
      }

      function getFieldSuggestions(indexPatterns) {
        return indexPatterns.reduce((fields, indexPattern) => {
          return [...fields, ...indexPattern.fields];
        }, []);
      }

      function getOperatorSuggestions(field) {
        const type = _.get(field, 'type');
        return FILTER_OPERATORS.filter((operator) => {
          return !operator.fieldTypes || operator.fieldTypes.includes(type);
        });
      }

      function getValueSuggestions(field, query) {
        if (!_.get(field, 'aggregatable')) {
          return Promise.resolve([]);
        }

        const params = {
          query,
          field: field.name
        };

        return $http.post(`../api/kibana/suggestions/values/${field.indexPattern.id}`, params)
          .then(response => response.data);
      }
    }
  };
});
