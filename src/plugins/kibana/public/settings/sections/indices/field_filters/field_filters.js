import { size, without } from 'lodash';

import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';
import { fieldWildcardMatcher } from 'ui/field_wildcard';

import template from './field_filters.html';
import './field_filters.less';

const notify = new Notifier();

uiModules.get('kibana')
.directive('settingsIndicesFieldFilters', function () {
  return {
    restrict: 'E',
    scope: {
      indexPattern: '='
    },
    template,
    controllerAs: 'fieldFilters',
    controller: class FieldFiltersController {
      constructor($scope) {
        if (!$scope.indexPattern) {
          throw new Error('index pattern is required');
        }

        this.$scope = $scope;
        this.saving = false;
        this.editting = null;
        this.newValue = null;

        $scope.$watch('indexPattern.fieldFilters', (filters) => {
          const values = filters.map(f => f.value);
          const filter = fieldWildcardMatcher(values);
          const matches = $scope.indexPattern.fields.map(f => f.name).filter(filter).sort();
          this.sampleMatches = size(matches) ? matches : null;
        });
      }

      all() {
        return this.$scope.indexPattern.fieldFilters;
      }

      delete(filter) {
        if (this.editting === filter) {
          this.editting = null;
        }

        this.$scope.indexPattern.fieldFilters = without(this.all(), filter);
        return this.save();
      }

      create() {
        const value = this.newValue;
        this.newValue = null;
        this.$scope.indexPattern.fieldFilters = [...this.all(), { value }];
        return this.save();
      }

      save() {
        this.saving = true;
        this.$scope.indexPattern.save()
        .then(() => this.editting = null)
        .catch(notify.error)
        .finally(() => this.saving = false);
      }
    }
  };
});
