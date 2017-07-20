import angular from 'angular';
import 'ace';
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';

import jsonHtml from './json.html';

DocViewsRegistryProvider.register(function () {
  return {
    title: 'JSON',
    order: 20,
    directive: {
      template: jsonHtml,
      scope: {
        hit: '='
      },
      controller: function ($scope) {
        $scope.hitJson = angular.toJson($scope.hit, true);

        $scope.aceLoaded = (editor) => {
          editor.$blockScrolling = Infinity;
        };
      }
    }
  };
});
