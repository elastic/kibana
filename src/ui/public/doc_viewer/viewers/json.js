import _ from 'lodash';
import angular from 'angular';
import 'ace';
import docTableDetailViewsRegistry from 'ui/registry/doc_table_detail_views';

import jsonHtml from './json.html';

docTableDetailViewsRegistry.register(function () {
  return {
    title: 'JSON',
    order: 20,
    template: jsonHtml,
    shouldShow: () => true,
    controller: function ($scope) {
      $scope.indexPattern = $scope.scope.indexPattern;
      $scope.hit = $scope.scope.hit;
      $scope.columns = $scope.scope.columns;
      $scope.filter = $scope.scope.filter;

      $scope.hitJson = angular.toJson($scope.hit, true);

      $scope.aceLoaded = (editor) => {
        editor.$blockScrolling = Infinity;
      };
    }
  };
});
