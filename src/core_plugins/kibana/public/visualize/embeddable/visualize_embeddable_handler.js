import angular from 'angular';

import visualizationTemplate from './visualize_template.html';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { UtilsBrushEventProvider as utilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarClickHandlerProvider as filterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { EmbeddableHandler } from 'ui/embeddable';

export class VisualizeEmbeddableHandler extends EmbeddableHandler {
  constructor($compile, $rootScope, visualizeLoader, timefilter, Notifier) {
    super();
    this.$compile = $compile;
    this.visualizeLoader = visualizeLoader;
    this.$rootScope = $rootScope;
    this.name = 'visualization';

    this.brushEvent = utilsBrushEventProvider(timefilter);
    this.filterBarClickHandler = filterBarClickHandlerProvider(Notifier);
  }

  async getEditPath(panelId) {
    return this.visualizeLoader.urlFor(panelId);
  }

  async getTitleFor(panelId) {
    const savedObject = await this.visualizeLoader.get(panelId);
    return savedObject.title;
  }

  async render(domNode, panel, container) {
    const savedObject = await this.visualizeLoader.get(panel.id);
    const visualizeScope = this.$rootScope.$new();
    visualizeScope.editUrl = await this.getEditPath(panel.id);
    visualizeScope.savedObj = savedObject;
    visualizeScope.panel = panel;

    const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
    visualizeScope.uiState = container.createChildUiState(getPersistedStateId(panel), uiState);

    visualizeScope.savedObj.vis.setUiState(visualizeScope.uiState);

    visualizeScope.savedObj.vis.listeners.click = this.filterBarClickHandler(container.getAppState());
    visualizeScope.savedObj.vis.listeners.brush = this.brushEvent(container.getAppState());
    visualizeScope.isFullScreenMode = container.getIsViewOnlyMode();

    container.registerPanelIndexPattern(panel.panelIndex, visualizeScope.savedObj.vis.indexPattern);

    const visualizationInstance = this.$compile(visualizationTemplate)(visualizeScope);
    const rootNode = angular.element(domNode);
    rootNode.append(visualizationInstance);

    visualizationInstance.on('$destroy', function () {
      visualizeScope.savedObj.destroy();
      visualizeScope.$destroy();
    });
  }
}

