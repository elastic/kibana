import React from 'react';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { FieldWildcardProvider } from 'ui/field_wildcard';
import template from './indexed_fields_table.html';

import {
 RIGHT_ALIGNMENT,
} from '@elastic/eui';

const renderBooleanForCondition = condition => {
  return () => {
    let content;

    if (condition) {
      content = <span className="fa fa-check" aria-label="yes" />;
    }

    return <div>{content}</div>;
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
        {
          title: 'name',
          text: 'Name', },
        {
          title: 'type',
          text: 'Type', },
        {
          title: 'format',
          text: 'Format', },
        {
          title: 'searchable',
          text: 'Searchable',
          info: 'These fields can be used in the filter bar' },
        {
          title: 'aggregatable',
          ext: 'Aggregatable',
          info: 'These fields can be used in visualization aggregations' },
        {
          title: 'excluded',
          text: 'Excluded',
          info: 'Fields that are excluded from _source when it is fetched' },
        {
          title: 'controls',
          text: '',
          sortable: false,
          align: RIGHT_ALIGNMENT,
        },
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
                  <div
                    data-test-subj="indexedFieldName"
                  >
                    <span>{field.displayName}</span>
                    &nbsp;
                    {content}
                  </div>
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
                  <div
                    data-test-subj="indexedFieldType"
                  >
                    <span>{field.type}</span>
                    {info}
                  </div>
                );
              },
              value: field.type,
            }, {
              // TODO: What is this?
              // _.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title']),
              render: () => '',
            }, {
              render: renderBooleanForCondition(field.searchable),
              value: field.searchable
            }, {
              render: renderBooleanForCondition(field.aggregatable),
              value: field.aggregatable
            }, {
              render: renderBooleanForCondition(excluded),
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
                  <div>
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
                  </div>
                );

              },
            }
          ];
        });
      }
    }
  };
});
