import { find, each, escape, invoke, size, without } from 'lodash';

import { uiModules } from 'ui/modules';
import { Notifier } from 'ui/notify/notifier';
import { FieldWildcardProvider } from 'ui/field_wildcard';

import controlsHtml from './controls.html';
import filterHtml from './filter.html';
import template from './source_filters_table.html';
import './source_filters_table.less';

const notify = new Notifier();

uiModules.get('kibana')
.directive('sourceFiltersTable', function (Private, $filter, confirmModal) {
  const angularFilter = $filter('filter');
  const { fieldWildcardMatcher } = Private(FieldWildcardProvider);
  const rowScopes = []; // track row scopes, so they can be destroyed as needed

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

        $scope.perPage = 25;
        $scope.columns = [
          {
            title: 'filter'
          },
          {
            title: 'matches',
            sortable: false,
            info: 'The source fields that match the filter.'
          },
          {
            title: 'controls',
            sortable: false
          }
        ];

        this.$scope = $scope;
        this.saving = false;
        this.editing = null;
        this.newValue = null;
        this.placeHolder = 'source filter, accepts wildcards (e.g., `user*` to filter fields starting with \'user\')';

        $scope.$watchMulti([ '[]indexPattern.sourceFilters', '$parent.fieldFilter' ], () => {
          invoke(rowScopes, '$destroy');
          rowScopes.length = 0;

          if ($scope.indexPattern.sourceFilters) {
            $scope.rows = [];
            each($scope.indexPattern.sourceFilters, (filter) => {
              const matcher = fieldWildcardMatcher([ filter.value ]);
              // compute which fields match a filter
              const matches = $scope.indexPattern.getNonScriptedFields().map(f => f.name).filter(matcher).sort();
              if ($scope.$parent.fieldFilter && !angularFilter(matches, $scope.$parent.fieldFilter).length) {
                return;
              }
              // compute the rows
              const rowScope = $scope.$new();
              rowScope.filter = filter;
              rowScopes.push(rowScope);
              $scope.rows.push([
                {
                  markup: filterHtml,
                  scope: rowScope
                },
                size(matches) ? escape(matches.join(', ')) : '<em>The source filter doesn\'t match any known fields.</em>',
                {
                  markup: controlsHtml,
                  scope: rowScope
                }
              ]);
            });
            // Update the tab count
            find($scope.$parent.editSections, { index: 'sourceFilters' }).count = $scope.rows.length;
          }
        });
      }

      all() {
        return this.$scope.indexPattern.sourceFilters || [];
      }

      delete(filter) {
        const doDelete = () => {
          if (this.editing === filter) {
            this.editing = null;
          }

          this.$scope.indexPattern.sourceFilters = without(this.all(), filter);
          return this.save();
        };

        const confirmModalOptions = {
          confirmButtonText: 'Delete filter',
          onConfirm: doDelete
        };
        confirmModal(`Are you sure want to delete this filter?`, confirmModalOptions);
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
