define(function (require) {
  require('ui/modules').get('apps/settings')
  .directive('sourceFiltering', function (Notifier, $window) {
    var notify = new Notifier();
    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/sections/indices/_source_filtering.html'),
      link: function ($scope) {
        $scope.showHelp = false;
        $scope.sourceFiltering = JSON.stringify($scope.indexPattern.getSourceFiltering(), null, ' ');
        $scope.save = function () {
          try {
            var sourceFiltering;

            if ($scope.sourceFiltering) {
              sourceFiltering = JSON.parse($scope.sourceFiltering);
              if (sourceFiltering.constructor !== Object) {
                throw 'You must enter a JSON object with exclude/include field(s)';
              }
              for (var att in sourceFiltering) {
                if (sourceFiltering.hasOwnProperty(att) && att !== 'exclude' && att !== 'include') {
                  throw 'The JSON object should have only either an exclude or an include field';
                }
              }
              $scope.indexPattern.setSourceFiltering(sourceFiltering);
              notify.info('Updated the set of retrieved fields');
            } else if ($scope.indexPattern.getSourceFiltering()) {
              var confirmIfEmpty = 'The following configuration will be deleted:\n\n' +
                JSON.stringify($scope.indexPattern.getSourceFiltering(), null, ' ');
              if ($window.confirm(confirmIfEmpty)) {
                $scope.indexPattern.setSourceFiltering(undefined);
                notify.info('All fields are now retrieved');
              } else {
                $scope.sourceFiltering = JSON.stringify($scope.indexPattern.getSourceFiltering(), null, ' ');
              }
            }
          } catch (e) {
            notify.error(e);
          }
        };
      }
    };
  });
});
