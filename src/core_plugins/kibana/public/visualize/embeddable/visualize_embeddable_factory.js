import angular from 'angular';
import 'ui/visualize';

import visualizationTemplate from './visualize_template.html';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';
import { UtilsBrushEventProvider as utilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarClickHandlerProvider as filterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { EmbeddableFactory, Embeddable } from 'ui/embeddable';

import chrome from 'ui/chrome';

export class VisualizeEmbeddableFactory extends EmbeddableFactory {
  constructor($compile, $rootScope, visualizeLoader, timefilter, Notifier, Promise, Private, config) {
    super();
    this._config = config;
    this.$compile = $compile;
    this.visualizeLoader = visualizeLoader;
    this.$rootScope = $rootScope;
    this.name = 'visualization';
    this.Promise = Promise;
    this.brushEvent = utilsBrushEventProvider(timefilter);
    this.filterBarClickHandler = filterBarClickHandlerProvider(Notifier, Private);
  }

  getEditPath(panelId) {
    return this.visualizeLoader.urlFor(panelId);
  }

  render(domNode, panel, container) {
    const visualizeScope = this.$rootScope.$new();
    visualizeScope.editUrl = this.getEditPath(panel.id);
    return this.visualizeLoader.get(panel.id)
      .then(savedObject => {
        const isLabsEnabled = this._config.get('visualize:enableLabs');

        if (!isLabsEnabled && savedObject.vis.type.stage === 'lab') {
          domNode.innerHTML = `
<div class="disabledLabVisualization">
  <div class="kuiVerticalRhythm disabledLabVisualization__icon kuiIcon fa-flask" aria-hidden="true"></div>
  <div class="kuiVerticalRhythm"><em>${savedObject.title}</em> is a lab visualization.</div>
  <div class="kuiVerticalRhythm">Please turn on lab-mode in the advanced settings to see lab visualizations.</div>
</div>
`;
          return new Embeddable({
            title: savedObject.title
          });
        }

        if (!container.getHidePanelTitles()) {
          visualizeScope.sharedItemTitle = panel.title !== undefined ? panel.title : savedObject.title;
        }
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

        this.addDestroyEmeddable(panel.panelIndex, () => {
          visualizationInstance.remove();
          visualizeScope.savedObj.destroy();
          visualizeScope.$destroy();
        });

        return new Embeddable({
          title: savedObject.title,
          editUrl: visualizeScope.editUrl
        });
      });
  }
}

