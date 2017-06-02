import angular from 'angular';

import visualizationTemplate from './visualize_template.html';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { UtilsBrushEventProvider as utilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarClickHandlerProvider as filterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';

export class VisualizeEmbeddableHandler {
  constructor($compile, $rootScope, visualizeLoader, timefilter, Notifier) {
    this.$compile = $compile;
    this.visualizeLoader = visualizeLoader;
    this.$rootScope = $rootScope;
    this.name = 'visualization';
    this.title = 'Visualizations';

    this.brushEvent = utilsBrushEventProvider(timefilter);
    this.filterBarClickHandler = filterBarClickHandlerProvider(Notifier);
  }

  getEditPath(panel) {
    return this.visualizeLoader.urlFor(panel.id);
  }

  getTitleFor(panel) {
    return this.visualizeLoader.get(panel.id).then(savedObject => savedObject.title);
  }

  render(domNode, panel, container) {
    return this.visualizeLoader.get(panel.id).then((savedObject) => {
      const visualizeScope = this.$rootScope.$new();
      visualizeScope.editUrl = this.getEditPath(panel);
      visualizeScope.savedObj = savedObject;
      visualizeScope.panel = panel;

      const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
      visualizeScope.uiState = container.createChildUiState(getPersistedStateId(panel), uiState);

      visualizeScope.savedObj.vis.setUiState(uiState);

      visualizeScope.savedObj.vis.listeners.click = this.filterBarClickHandler(container.getAppState());
      visualizeScope.savedObj.vis.listeners.brush = this.brushEvent(container.getAppState());
      visualizeScope.isFullScreenMode = container.getIsViewOnlyMode();

      const visualizationInstance = this.$compile(visualizationTemplate)(visualizeScope);
      const rootNode = angular.element(domNode);
      rootNode.append(visualizationInstance);

      visualizationInstance.on('$destroy', function () {
        visualizeScope.savedObj.destroy();
        visualizeScope.$destroy();
      });
    });
  }
}

