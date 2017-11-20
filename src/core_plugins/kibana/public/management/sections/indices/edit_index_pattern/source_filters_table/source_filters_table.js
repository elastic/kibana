import React from 'react';
import { find, each, escape, size, without } from 'lodash';

import { uiModules } from 'ui/modules';
import { Notifier } from 'ui/notify/notifier';
import { FieldWildcardProvider } from 'ui/field_wildcard';

import template from './source_filters_table.html';
import './source_filters_table.less';

import {
 RIGHT_ALIGNMENT,
} from '@elastic/eui';

const notify = new Notifier();

uiModules.get('kibana')
.directive('sourceFiltersTable', function (Private, $filter, confirmModal) {
  const angularFilter = $filter('filter');
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

        $scope.perPage = 25;
        $scope.columns = [
          {
            title: 'filter',
            text: 'Filter',
          },
          {
            title: 'matches',
            text: 'Matches',
            sortable: false,
            info: 'The source fields that match the filter.'
          },
          {
            title: 'controls',
            text: '',
            sortable: false,
            align: RIGHT_ALIGNMENT,
          }
        ];

        this.$scope = $scope;
        this.saving = false;
        this.editing = null;
        this.newValue = null;
        this.placeHolder = 'source filter, accepts wildcards (e.g., `user*` to filter fields starting with \'user\')';

        $scope.$watchMulti([ '[]indexPattern.sourceFilters', '$parent.fieldFilter' ], () => {
          if ($scope.indexPattern.sourceFilters) {
            $scope.rows = [];
            each($scope.indexPattern.sourceFilters, (filter) => {
              const matcher = fieldWildcardMatcher([ filter.value ]);
              // compute which fields match a filter
              const matches = $scope.indexPattern.getNonScriptedFields().map(f => f.name).filter(matcher).sort();
              if ($scope.$parent.fieldFilter && !angularFilter(matches, $scope.$parent.fieldFilter).length) {
                return;
              }

              $scope.rows.push([
                {
                  render: () => {
                    let content;
                    if (filter === this.editing) {
                      // TODO: Ensure value changes during onChange.
                      content = (
                        <input
                          className="form-control"
                          value={filter.value}
                          onChange={e => {
                            $scope.$apply(() => {
                              filter.value = e.target.value;
                            });
                          }}
                          placeholder={this.placeHolder}
                          type="text"
                          required
                        />
                      );
                    } else {
                      content = <span>{filter.value}</span>;
                    }

                    return (
                      <div className="value">
                        {content}
                      </div>
                    );
                  },
                }, {
                  render: () => {
                    return (
                      <div>
                        {
                          size(matches)
                            ? escape(matches.join(', '))
                            : <em>The source filter doesn&rsquo;t match any known fields.</em>
                        }
                      </div>
                    );
                  },
                }, {
                  render: () => {
                    let button;

                    if (filter === this.editing) {
                      button = (
                        <button
                          aria-label="Save"
                          onClick={this.save}
                          disabled={!filter.value}
                          type="button"
                          className="kuiButton kuiButton--primary kuiButton--small"
                        >
                          <span aria-hidden="true" className="kuiIcon fa-save" />
                        </button>
                      );
                    } else {
                      // TODO: Are these onClicks handled correctly? Do we depend upon
                      // $scope.$digest being triggered?
                      button = (
                        <button
                          aria-label="Edit"
                          onClick={() => { this.editing = filter; }}
                          type="button"
                          className="kuiButton kuiButton--basic kuiButton--small"
                        >
                          <span aria-hidden="true" className="kuiIcon fa-pencil" />
                        </button>
                      );
                    }

                    return (
                      <div className="actions">
                        {button}

                        <button
                          aria-label="Delete"
                          onClick={() => { this.delete(filter); }}
                          type="button"
                          className="kuiButton kuiButton--danger kuiButton--small"
                        >
                          <span aria-hidden="true" className="kuiIcon fa-trash" />
                        </button>
                      </div>
                    );
                  },
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
