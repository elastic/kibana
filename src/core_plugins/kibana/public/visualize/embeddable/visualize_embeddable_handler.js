import angular from 'angular';

import visualizationTemplate from './visualize_template.html';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';

export class VisualizeEmbeddableHandler {
  constructor($compile, $rootScope, visualizeLoader) {
    this.$compile = $compile;
    this.visualizeLoader = visualizeLoader;
    this.$rootScope = $rootScope;
    this.name = 'visualization';
    this.title = 'Visualizations';
  }

  getEditPath(panel) {
    return this.visualizeLoader.urlFor(panel.id);
  }

  canRenderType(type) {
    return type === 'visualization';
  }

  getTitleFor(panel) {
    return this.visualizeLoader.get(panel.id).then(savedObject => savedObject.title);
  }

  renderAt(domNode, panel, actions) {
    return this.visualizeLoader.get(panel.id).then((savedObject) => {
      const visualizeScope = this.$rootScope.$new();
      visualizeScope.editUrl = this.getEditPath(panel);
      visualizeScope.savedObj = savedObject;
      visualizeScope.panel = panel;
      visualizeScope.appState = actions.getAppState();

      const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
      visualizeScope.uiState = actions.createChildUiState(getPersistedStateId(panel), uiState);

      visualizeScope.savedObj.vis.setUiState(uiState);
      visualizeScope.savedObj.vis.listeners.click = actions.getVisClickHandler();
      visualizeScope.savedObj.vis.listeners.brush = actions.getVisBrushHandler();
      visualizeScope.isFullScreenMode = actions.getIsViewOnlyMode();

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
