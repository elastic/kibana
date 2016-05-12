import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';

export default function visualizationLoader(savedVisualizations, Private) { // Inject services here
  const brushEvent = Private(UtilsBrushEventProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  return function (panel, $scope) { // Function parameters here
    return savedVisualizations.get(panel.id)
    .then(function (savedVis) {
      // $scope.state comes via $scope inheritence from the dashboard app. Don't love this.
      savedVis.vis.listeners.click = filterBarClickHandler($scope.state);
      savedVis.vis.listeners.brush = brushEvent;

      return {
        savedObj: savedVis,
        panel: panel,
        uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
        editUrl: savedVisualizations.urlFor(panel.id)
      };
    });
  };
};
