import { size, without } from 'lodash';

import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';
import FieldWildcardProvider from 'ui/field_wildcard';

import template from './source_filters.html';
import './source_filters.less';

const notify = new Notifier();

uiModules.get('kibana')
.directive('sourceFilters', function (Private) {
  const { fieldWildcardMatcher } = Private(FieldWildcardProvider);
  return {
    restrict: 'E',
    scope: {
      indexPattern: '='
    },
    template,
    controllerAs: 'sourceFilters',
    controller: class FieldFiltersController {
      constructor($scope) {
        if (!$scope.indexPattern) {
          throw new Error('index pattern is required');
        }

        this.$scope = $scope;
        this.saving = false;
        this.editing = null;
        this.newValue = null;
        this.placeHolder = 'field name filter, accepts wildcards (e.g., `user*` to filter fields starting with \'user\')';

        $scope.$watch('indexPattern.sourceFilters', (filters) => {
          if (filters) {
            const values = filters.map(f => f.value);
            const filter = fieldWildcardMatcher(values);
            const matches = $scope.indexPattern.getNonScriptedFields().map(f => f.name).filter(filter).sort();
            this.sampleMatches = size(matches) ? matches : null;
          }
        });
      }

      all() {
        return this.$scope.indexPattern.sourceFilters || [];
      }

      delete(filter) {
        if (this.editing === filter) {
          this.editing = null;
        }

        this.$scope.indexPattern.sourceFilters = without(this.all(), filter);
        return this.save();
      }

      create() {
        const value = this.newValue;
        this.newValue = null;
        this.$scope.indexPattern.sourceFilters = [...this.all(), { value }];
        return this.save();
      }

      save() {
        this.saving = true;
        this.$scope.indexPattern.save()
        .then(() => this.editing = null)
        .catch(notify.error)
        .finally(() => this.saving = false);
      }
    }
  };
});
