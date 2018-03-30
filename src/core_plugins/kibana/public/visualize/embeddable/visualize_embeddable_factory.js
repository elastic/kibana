import $ from 'jquery';
import _ from 'lodash';
import { getVisualizeLoader } from 'ui/visualize/loader';

import { UtilsBrushEventProvider as utilsBrushEventProvider } from 'ui/utils/brush_event';
import { FilterBarClickHandlerProvider as filterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';
import { EmbeddableFactory, Embeddable } from 'ui/embeddable';
import { PersistedState } from 'ui/persisted_state';

import labDisabledTemplate from './visualize_lab_disabled.html';

import chrome from 'ui/chrome';

export class VisualizeEmbeddableFactory extends EmbeddableFactory {
  constructor(savedVisualizations, searchLoader, timefilter, Private, config) {
    super();
    this._config = config;
    this.savedVisualizations = savedVisualizations;
    this.searchLoader = searchLoader;
    this.name = 'visualization';
    this.brushEvent = utilsBrushEventProvider(timefilter);
    this.filterBarClickHandler = filterBarClickHandlerProvider(Private);
  }

  getEditPath(panelId) {
    return this.savedVisualizations.urlFor(panelId);
  }

  render = async (domNode, panel, container) => {
    const editUrl = this.getEditPath(panel.id);

    const waitFor = [ getVisualizeLoader(), this.savedVisualizations.get(panel.id) ];
    const [loader, savedObject] = await Promise.all(waitFor);

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

        function hasQueryOrFilters(searchSource) {
          const filters = searchSource.get('filter');
          if (filters.length > 0) {
            return true;
          }

          const query = searchSource.get('query');
          if (query.query && query.query.length > 0) {
            return true;
          }

          return false;
        }

        function getFilterLabel(filter) {
          if (!_.has(filter, 'meta') || (!filter.meta.alias &&
            (!filter.meta.key && !filter.meta.value)) ) {
            return '';
          }

          let prefix = _.get(filter, 'meta.negate', false) ? 'NOT' : '';
          if (filter.meta.alias) {
            return `"${prefix} ${filter.meta.alias}"`
          }

          return `"${prefix} ${filter.meta.key}:${filter.meta.value}"`;
        }

        function getSearchSourceLabel(searchSource) {
          let label = '';
          const filters = searchSource.get('filter');
          if (filters.length > 0) {
            const filterLabels = filters.map(filter => {
              return getFilterLabel(filter);
            });
            label = `filters=${filterLabels.join(',')}`;
          }

          const query = searchSource.get('query');
          if (query.query && query.query.length > 0) {
            label = `${label} query="${query.query}"`;
          }

          return label;
        }

        let hasSearch = false;
        let searchLabel = '';
        if (hasQueryOrFilters(savedObject.searchSource)) {
          hasSearch = true;
          searchLabel = `This visualization has the following search criteria applied: ${getSearchSourceLabel(savedObject.searchSource)}`;
        }
        if (savedObject.savedSearchId) {
          hasSearch = true;
          const savedSearch = await this.searchLoader.get(savedObject.savedSearchId)
          searchLabel = `${searchLabel} This visualization is linked to Saved Search "${savedSearch.title}" that applies the following search criteria: ${getSearchSourceLabel(savedSearch.searchSource)}`;
        }

        return new Embeddable({
          title: savedObject.title,
          editUrl,
          hasSearch,
          searchLabel,
        });
  }
}
