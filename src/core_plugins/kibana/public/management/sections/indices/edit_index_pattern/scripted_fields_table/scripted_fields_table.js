import React from 'react';
import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './scripted_fields_table.html';

import {
 RIGHT_ALIGNMENT,
} from '@elastic/eui';

uiModules.get('apps/management')
.directive('scriptedFieldsTable', function (kbnUrl, $filter, confirmModal, chrome) {
  const filter = $filter('filter');

  return {
    restrict: 'E',
    template,
    scope: true,
    link: function ($scope) {
      $scope.perPage = 25;
      $scope.columns = [
        {
          title: 'name',
          text: 'Name',
        }, {
          title: 'lang',
          text: 'Lang',
        }, {
          title: 'script',
          text: 'Script',
        }, {
          title: 'format',
          text: 'Format',
        }, {
          title: 'controls',
          text: '',
          sortable: false,
          align: RIGHT_ALIGNMENT,
        },
      ];

      const remove = field => {
        const confirmModalOptions = {
          confirmButtonText: 'Delete field',
          onConfirm: () => { $scope.indexPattern.removeScriptedField(field.name); }
        };
        confirmModal(`Are you sure want to delete ${field.name}? This action is irreversible!`, confirmModalOptions);
      };

      function refreshRows() {
        const fields = filter($scope.indexPattern.getScriptedFields(), {
          name: $scope.fieldFilter,
          lang: $scope.scriptedFieldLanguageFilter
        });
        _.find($scope.editSections, { index: 'scriptedFields' }).count = fields.length; // Update the tab count

        $scope.rows = fields.map(function (field) {
          return [
            {
              render: () => (
                <div>
                  {_.escape(field.name)}
                </div>
              ),
            }, {
              render: () => (
                <div data-test-subj="scriptedFieldLang">
                  {field.lang}
                </div>
              ),
            }, {
              render: () => (
                <div>
                  {_.escape(field.script)}
                </div>
              ),
            }, {
              render: () => (
                <div>
                  {_.get($scope.indexPattern, ['fieldFormatMap', field.name, 'type', 'title'])}
                </div>
              ),
            }, {
              render: () => {
                let deleteButton;

                if (field.scripted) {
                  deleteButton = (
                    <button
                      onClick={() => { remove(field); }}
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

      $scope.$watchMulti([
        '[]indexPattern.fields',
        'fieldFilter',
        'scriptedFieldLanguageFilter',
      ], refreshRows);
    }
  };
});
