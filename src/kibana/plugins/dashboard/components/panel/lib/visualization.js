define(function (require) {
  return function visualizationLoader(savedVisualizations, Private) { // Inject services here
    var brushEvent = Private(require('utils/brush_event'));
    var filterBarClickHandler = Private(require('components/filter_bar/filter_bar_click_handler'));

    return function (panel, $scope) { // Function parameters here
      return savedVisualizations.get(panel.id)
        .then(function (savedVis) {
          // $scope.state comes via $scope inheritence from the dashboard app. Don't love this.
          savedVis.vis.listeners.click = filterBarClickHandler($scope.state);
          savedVis.vis.listeners.brush = brushEvent;

          return {
            savedObj: savedVis,
            panel: panel,
            edit: '#visualize/edit'
          };
        });
    };
  };
});
