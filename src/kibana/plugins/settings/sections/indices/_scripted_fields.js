define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('modules').get('apps/settings')
  .directive('scriptedFields', function ($compile) {
    var rowScopes = []; // track row scopes, so they can be destroyed as needed
    var popularityHtml = require('text!plugins/settings/sections/indices/_popularity.html');

    return {
      restrict: 'E',
      template: require('text!plugins/settings/sections/indices/_scripted_fields.html'),
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.perPage = 25;

        $scope.columns = [{
          title: 'name'
        }, {
          title: 'script'
        }];

        $scope.rows = [
          ['some name', 'script content'],
          ['some name', 'script content'],
          ['some name', 'script content'],
          ['some name', 'script content'],
        ];

        // $scope.rows = $scope.indexPattern.scriptedFields.map(function (field) {

        // });
      }
    };
  });
});