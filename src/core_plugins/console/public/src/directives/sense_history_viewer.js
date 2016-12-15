const history = require('../history');
let SenseEditor = require('../sense_editor/editor');
import { useResizeCheckerProvider } from '../sense_editor_resize';

require('ui/modules')
.get('app/sense')
.directive('senseHistoryViewer', function (Private) {
  const useResizeChecker = Private(useResizeCheckerProvider);

  return {
    restrict: 'E',
    scope: {
      req: '=',
    },
    link: function ($scope, $el) {
      const viewer = new SenseEditor($el);
      viewer.setReadOnly(true);
      viewer.renderer.setShowPrintMargin(false);
      useResizeChecker($scope, $el, viewer);
      require('../settings').applyCurrentSettings(viewer);

      $scope.$watch('req', function (req) {
        if (req) {
          var s = req.method + " " + req.endpoint + "\n" + (req.data || "");
          viewer.setValue(s);
          viewer.clearSelection();
        } else {
          viewer.getSession().setValue("No history available")
        }
      });

      $scope.$on('$destroy', function () {
        viewer.destroy();
      });
    }
  }
})
