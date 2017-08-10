import angular from 'angular';

import visualizationTemplate from './visualize_template.html';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { UtilsBrushEventProvider as utilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarClickHandlerProvider as filterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { EmbeddableHandler } from 'ui/embeddable';
import chrome from 'ui/chrome';

export class VisualizeEmbeddableHandler extends EmbeddableHandler {
  constructor($compile, $rootScope, visualizeLoader, timefilter, Notifier, Promise) {
    super();
    this.$compile = $compile;
    this.visualizeLoader = visualizeLoader;
    this.$rootScope = $rootScope;
    this.name = 'visualization';
    this.Promise = Promise;
    this.brushEvent = utilsBrushEventProvider(timefilter);
    this.filterBarClickHandler = filterBarClickHandlerProvider(Notifier);
  }

  getEditPath(panelId) {
    return this.Promise.resolve(this.visualizeLoader.urlFor(panelId));
  }

  getTitleFor(panelId) {
    return this.visualizeLoader.get(panelId).then(savedObject => savedObject.title);
  }

  render(domNode, panel, container) {
    const visualizeScope = this.$rootScope.$new();
    return this.getEditPath(panel.id)
      .then(editPath => {
        visualizeScope.editUrl = editPath;
        return this.visualizeLoader.get(panel.id);
      })
      .then(savedObject => {
        visualizeScope.savedObj = savedObject;
        visualizeScope.panel = panel;

        const uiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
        visualizeScope.uiState = container.createChildUistate(getPersistedStateId(panel), uiState);

        visualizeScope.savedObj.vis.setUiState(visualizeScope.uiState);

        visualizeScope.savedObj.vis.listeners.click = this.filterBarClickHandler(container.getAppState());
        visualizeScope.savedObj.vis.listeners.brush = this.brushEvent(container.getAppState());

        // The chrome is permanently hidden in "embed mode" in which case we don't want to show the spy pane, since
        // we deem that situation to be more public facing and want to hide more detailed information.
        visualizeScope.getShouldShowSpyPane = () => !chrome.getIsChromePermanentlyHidden();

        container.registerPanelIndexPattern(panel.panelIndex, visualizeScope.savedObj.vis.indexPattern);

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

