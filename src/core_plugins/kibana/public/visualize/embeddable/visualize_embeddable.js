import { PersistedState } from 'ui/persisted_state';
import { Embeddable } from 'ui/embeddable';
import chrome from 'ui/chrome';
import _ from 'lodash';

export class VisualizeEmbeddable extends Embeddable  {
  constructor({ onEmbeddableStateChanged, savedVisualization, editUrl, loader }) {
    super();
    this._onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedVisualization = savedVisualization;
    this.loader = loader;

    const parsedUiState = savedVisualization.uiStateJSON ? JSON.parse(savedVisualization.uiStateJSON) : {};
    this.uiState = new PersistedState({
      ...parsedUiState,
    });

    this._uiStateChangeHandler = this._uiStateChangeHandler.bind(this);
    this.uiState.on('change', this._uiStateChangeHandler);

    /**
     * @type {EmbeddableMetadata}
     */
    this.metadata = {
      title: savedVisualization.title,
      editUrl,
      indexPattern: this.savedVisualization.vis.indexPattern
    };
  }

  _uiStateChangeHandler() {
    this.personalization = this.uiState.toJSON();
    this._onEmbeddableStateChanged(this.getEmbeddableState());
  }

  getEmbeddableState() {
    return {
      personalization: this.personalization,
    };
  }

  getHandlerParams() {
    return {
      uiState: this.uiState,
      // Append visualization to container instead of replacing its content
      append: true,
      timeRange: this.timeRange,
      cssClass: `panel-content panel-content--fullWidth`,
      // The chrome is permanently hidden in "embed mode" in which case we don't want to show the spy pane, since
      // we deem that situation to be more public facing and want to hide more detailed information.
      showSpyPanel: !chrome.getIsChromePermanentlyHidden(),
      dataAttrs: {
        'shared-item': '',
        title: this.panelTitle,
        description: this.savedVisualization.description,
      }
    };
  }

  onContainerStateChanged(containerState) {
    const personalization = containerState.embeddablePersonalization;
    let isDirty = false;
    if (!_.isEqual(this.personalization, personalization)) {
      // Turn this off or the uiStateChangeHandler will fire for every modification.
      this.uiState.off('change', this._uiStateChangeHandler);
      this.uiState.clearAllKeys();
      Object.getOwnPropertyNames(personalization).forEach(key => {
        this.uiState.set(key, personalization[key]);
      });
      this.personalization = personalization;
      isDirty = true;
      this.uiState.on('change', this._uiStateChangeHandler);
    }

    let derivedPanelTitle = '';
    if (!containerState.hidePanelTitles) {
      derivedPanelTitle = containerState.customTitle !== undefined ?
        containerState.customTitle :
        this.savedVisualization.title;
    }

    if (this.panelTitle !== derivedPanelTitle) {
      this.panelTitle = derivedPanelTitle;
      isDirty = true;
    }

    if (isDirty && this.handler && this.domNode) {
      // TODO: We need something like this in the handler
      // this.handler.update(this.getHandlerParams());
      // For now:
      this.destroy();
      this.handler = this.loader.embedVisualizationWithSavedObject(
        this.domNode,
        this.savedVisualization,
        this.getHandlerParams());
    }
  }

  render(domNode) {
    this.domNode = domNode;
    this.handler = this.loader.embedVisualizationWithSavedObject(
      domNode,
      this.savedVisualization,
      this.getHandlerParams());
  }

  destroy() {
    this.uiState.off('change', this._uiStateChangeHandler);
    this.savedVisualization.destroy();
    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
  }
}
