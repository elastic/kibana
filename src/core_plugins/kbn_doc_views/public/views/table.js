import _ from 'lodash';
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';

import tableHtml from './table.html';
import { Notifier } from 'ui/notify/notifier';

DocViewsRegistryProvider.register(function () {
  return {
    title: 'Table',
    order: 10,
    directive: {
      template: tableHtml,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=',
        columns: '=',
        onAddColumn: '=',
        onRemoveColumn: '=',
      },
      controller: function ($scope) {
        $scope.mapping = $scope.indexPattern.fields.byName;
        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
        $scope.fields = _.keys($scope.flattened).sort();

        $scope.canToggleColumns = function canToggleColumn() {
          return (
            _.isFunction($scope.onAddColumn)
            && _.isFunction($scope.onRemoveColumn)
          );
        };

        $scope.toggleColumn = function toggleColumn(columnName) {
          if ($scope.columns.includes(columnName)) {
            $scope.onRemoveColumn(columnName);
          } else {
            $scope.onAddColumn(columnName);
          }
        };

        $scope.copyToClipboard = function copyToClipboard(field) {
          const notify = new Notifier({
            location: `Copy to clipboard`,
          });

          const textArea = document.createElement('textarea');
          textArea.style.position = 'fixed';
          textArea.style.top = 0;
          textArea.style.left = 0;
          textArea.style.width = '2em';
          textArea.style.height = '2em';
          textArea.style.padding = 0;
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';
          textArea.style.background = 'transparent';
          textArea.value = $scope.flattened[field];

          document.body.appendChild(textArea);

          textArea.select();

          try {
            const successful = document.execCommand('copy');
            if(successful) {
              notify.info('Value copied');
            } else {
              notify.info('Value not copied');
            }
          } catch (err) {
            console.log(err);
            notify.info('Oops, unable to copy');
          }

          document.body.removeChild(textArea);
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          const value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };
      }
    }
  };
});
