import React from 'react';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { FieldWildcardProvider } from 'ui/field_wildcard';
import template from './indexed_fields_table.html';

const renderBooleanForCondition = (condition, key) => {
  return () => {
    let content;

    if (condition) {
      content = <span className="fa fa-check" aria-label="yes" />;
    }

    return <td key={key}>{content}</td>;
  };
};

uiModules.get('apps/management')
.directive('indexedFieldsTable', function (Private, $filter, chrome, kbnUrl) {
  const filter = $filter('filter');
  const { fieldWildcardMatcher } = Private(FieldWildcardProvider);

  return {
    restrict: 'E',
    template,
    scope: true,
    link: function ($scope) {
      $scope.perPage = 25;
      $scope.columns = [
        { title: 'name' },
        { title: 'type' },
        { title: 'format' },
        { title: 'searchable', info: 'These fields can be used in the filter bar' },
        { title: 'aggregatable', info: 'These fields can be used in visualization aggregations' },
        { title: 'excluded', info: 'Fields that are excluded from _source when it is fetched' },
        { title: 'controls', sortable: false }
      ];

      $scope.$watchMulti(['[]indexPattern.fields', 'fieldFilter', 'indexedFieldTypeFilter'], refreshRows);

      function refreshRows() {
        const fields = filter($scope.indexPattern.getNonScriptedFields(), {
          name: $scope.fieldFilter,
          type: $scope.indexedFieldTypeFilter
        });
        const sourceFilters = $scope.indexPattern.sourceFilters && $scope.indexPattern.sourceFilters.map(f => f.value) || [];
        const fieldWildcardMatch = fieldWildcardMatcher(sourceFilters);
        _.find($scope.editSections, { index: 'indexedFields' }).count = fields.length; // Update the tab count

        $scope.rows = fields.map(function (field) {
          const excluded = fieldWildcardMatch(field.name);

          return [
            {
              render: () => {
                let content;

                if ($scope.indexPattern.timeFieldName === field.name) {
                  content = (
                    <span
                      tooltip="This field represents the time that events occurred."
                      className="label label-default"
                    >
                      <span aria-hidden="true" className="fa fa-clock-o" />
                    </span>
                  );
                }

                return (
                  <td
                    data-test-subj="indexedFieldName"
                    key="indexedFieldName"
                  >
                    <span>{field.displayName}</span>
                    &nbsp;
                    {content}
                  </td>
                );
              },
              value: field.displayName,
            }, {
              render: () => {
                let info;

                if (field.type === 'conflict') {
                  info = (
                    <span
                      aria-label="The type of this field changes across indices. It is unavailable for many analysis functions."
                      tooltip="The type of this field changes across indices. It is unavailable for many analysis functions."
                      className="fa fa-warning text-color-warning"
                    />
                  );
                }

                return (
                  <td
                    data-test-subj="indexedFieldType"
                    key="indexedFieldType"
                  >
                    <span>{field.type}</span>
                    {info}
                  </td>
                );
              },
              value: field.type,
            }, {
              // TODO: What is this?
              // _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
              render: () => <td key="fieldFormatMapType" />
            }, {
              render: renderBooleanForCondition(field.searchable, 'searchable'),
              value: field.searchable
            }, {
              render: renderBooleanForCondition(field.aggregatable, 'aggregatable'),
              value: field.aggregatable
            }, {
              render: renderBooleanForCondition(excluded, 'excluded'),
              value: excluded
            }, {
              render: () => {
                let deleteButton;

                if (field.scripted) {
                  deleteButton = (
                    <button
                      ng-if=""
                      onClick="remove(field)"
                      className="kuiButton kuiButton--danger kuiButton--small"
                      aria-label="Delete"
                    >
                      <span aria-hidden="true" className="kuiIcon fa-trash" />
                    </button>
                  );
                }

                return (
                  <td key="actions">
                    <div className="actions">
                      <a
                        data-test-subj="indexPatternFieldEditButton"
                        href={chrome.addBasePath(kbnUrl.getRouteHref(field, 'edit'))}
                        aria-label="Edit"
                        className="kuiButton kuiButton--basic kuiButton--small"
                      >
                        <span aria-hidden="true" className="kuiIcon fa-pencil" />
                      </a>

                      {deleteButton}
                    </div>
                  </td>
                );

              },
            }
          ];
        });
      }
    }
  };
});
