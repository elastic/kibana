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
      controller: function ($scope, $element) {
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

        $scope.isCopySupported = function isCopySupported() {
          return document.queryCommandSuppoerted('copy');
        };

        $scope.copyToClipboard = function copyToClipboard($index) {

          const notify = new Notifier({
            location: `Copy to clipboard`,
          });

          const node = $element[0].querySelector('div.copy-target-' + $index + ' > span');
          const range = document.createRange();
          range.selectNode(node);
          window.getSelection().addRange(range);

          try {
            const successful = document.execCommand('copy');
            if(successful) {
              notify.info('Value copied');
            }  else {
              notify.warning('Coulndn\'t copy value');
            }
          } catch(err) {
            notify.error('Error during copying value');
            console.error(err);
          }
          window.getSelection().removeAllRanges();
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          const value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };
      }
    }
  };
});
