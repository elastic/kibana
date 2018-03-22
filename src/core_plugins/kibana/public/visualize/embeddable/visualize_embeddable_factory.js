import $ from 'jquery';
import { getVisualizeLoader } from 'ui/visualize/loader';

import { UtilsBrushEventProvider as utilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarClickHandlerProvider as filterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { EmbeddableFactory, Embeddable } from 'ui/embeddable';
import { PersistedState } from 'ui/persisted_state';

import labDisabledTemplate from './visualize_lab_disabled.html';

import chrome from 'ui/chrome';

export class VisualizeEmbeddableFactory extends EmbeddableFactory {
  constructor(savedVisualizations, timefilter, Promise, Private, config) {
    super();
    this._config = config;
    this.savedVisualizations = savedVisualizations;
    this.name = 'visualization';
    this.Promise = Promise;
    this.brushEvent = utilsBrushEventProvider(timefilter);
    this.filterBarClickHandler = filterBarClickHandlerProvider(Private);
  }

  getEditPath(panelId) {
    return this.savedVisualizations.urlFor(panelId);
  }

  render(domNode, panel, container) {
    const editUrl = this.getEditPath(panel.id);

    const waitFor = [ getVisualizeLoader(), this.savedVisualizations.get(panel.id) ];
    return this.Promise.all(waitFor)
      .then(([loader, savedObject]) => {
        const isLabsEnabled = this._config.get('visualize:enableLabs');

        if (!isLabsEnabled && savedObject.vis.type.stage === 'lab') {
          const template = $(labDisabledTemplate);
          template.find('.disabledLabVisualization__title').text(savedObject.title);
          $(domNode).html(template);

          return new Embeddable({
            title: savedObject.title
          });
        }

        let panelTitle;
        if (!container.getHidePanelTitles()) {
          panelTitle = panel.title !== undefined ? panel.title : savedObject.title;
        }

        const parsedUiState = savedObject.uiStateJSON ? JSON.parse(savedObject.uiStateJSON) : {};
        const uiState = new PersistedState({
          ...parsedUiState,
          ...panel.embeddableConfig,
        });
        container.onEmbeddableConfigChanged(panel.panelIndex, newEmbeddableConfig => {
          uiState.clearAllKeys();
          Object.getOwnPropertyNames(newEmbeddableConfig).forEach(key => {
            uiState.set(key, newEmbeddableConfig[key]);
          });
        });

        const uiStateChangeHandler = () => {
          panel = container.updatePanel(
            panel.panelIndex,
            { embeddableConfig: uiState.toJSON() }
          );
        };
        uiState.on('change', uiStateChangeHandler);

        container.registerPanelIndexPattern(panel.panelIndex, savedObject.vis.indexPattern);

        const handler = loader.embedVisualizationWithSavedObject(domNode, savedObject, {
          uiState: uiState,
          // Append visualization to container instead of replacing its content
          append: true,
          cssClass: `panel-content panel-content--fullWidth`,
          // The chrome is permanently hidden in "embed mode" in which case we don't want to show the spy pane, since
          // we deem that situation to be more public facing and want to hide more detailed information.
          showSpyPanel: !chrome.getIsChromePermanentlyHidden(),
          dataAttrs: {
            'shared-item': '',
            title: panelTitle,
            description: savedObject.description,
          }
        });

        this.addDestroyEmeddable(panel.panelIndex, () => {
          uiState.off('change', uiStateChangeHandler);
          handler.getElement().remove();
          savedObject.destroy();
          handler.destroy();
        });

        return new Embeddable({
          title: savedObject.title,
          editUrl: editUrl
        });
      });
  }
}
