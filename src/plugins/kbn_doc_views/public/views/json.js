import _ from 'lodash';
import angular from 'angular';
import 'ace';
import docViewsRegistry from '../../../../ui/public/registry/doc_views';

import jsonHtml from './json.html';

docViewsRegistry.register(function () {
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
