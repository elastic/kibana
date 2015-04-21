define(function (require) {
  require('modules')
  .get('apps/settings')
  .directive('kbnSettingsIndexHeader', function (config) {
    return {
      restrict: 'E',
      template: require('text!plugins/settings/sections/indices/_index_header.html'),
      scope: {
        indexPattern: '=',
        setDefault: '&',
        refreshFields: '&',
        delete: '&'
      },
      link: function ($scope) {
        config.$bind($scope, 'defaultIndex');
      }
    };
  });
});
