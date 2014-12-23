define(function (require) {
  var _ = require('lodash');

  var html = require('text!components/doc_table/doc_table.html');
  require('css!components/doc_table/doc_table.css');

  require('modules').get('kibana')
  .directive('docTable', function (config, Private, Notifier) {
    var formats = Private(require('components/index_patterns/_field_formats'));

    return {
      restrict: 'E',
      template: html,
      scope: {
        searchSource: '=',
        columns: '=',
        filter: '=?',
      },
      link: function ($scope, $el, attr) {
        var notify = new Notifier();

        var prereq = (function () {
          var fns = [];

          return function register(fn) {
            fns.push(fn);

            return function () {
              fn.apply(this, arguments);

              if (fns.length) {
                _.pull(fns, fn);
                if (!fns.length) {
                  $scope.$root.$broadcast('ready:vis');
                }
              }
            };
          };
        }());

        $scope.$watch('searchSource', prereq(function (searchSource) {
          if (!searchSource) return;

          // TODO: we need to have some way to clean up result requests
          searchSource.onResults().then(function onResults(resp) {
            if ($scope.searchSource !== searchSource) return;

            $scope.content = resp;

            return searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          searchSource.onError(notify.error).catch(notify.fatal);
        }));

      }
    };
  });
});