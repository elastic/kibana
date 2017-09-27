import {
  EMBEDDABLE_RENDER_FINISHED,
  EMBEDDABLE_RENDER_REQUESTED,
  EMBEDDABLE_RENDER_ERROR,
  UPDATE_PANELS,
  UPDATE_PANEL,
  UPDATE_VIEW_MODE,
  UPDATE_MAXIMIZED_PANEL_ID,
  DELETE_PANEL,
  UPDATE_IS_FULL_SCREEN_MODE,
} from './action_types';

function embeddableRenderRequested(panelId) {
  return {
    type: EMBEDDABLE_RENDER_REQUESTED,
    panelId: panelId
  };
}

function embeddableRenderFinished(panelId, embeddable) {
  return {
    type: EMBEDDABLE_RENDER_FINISHED,
    embeddable,
    panelId,
  };
}

function embeddableRenderError(panelId, error) {
  return {
    type: EMBEDDABLE_RENDER_ERROR,
    panelId,
    error
  };
}

export function deletePanel(panelId) {
  return {
    type: DELETE_PANEL,
    panelId
  };
}

export function updateViewMode(viewMode) {
  return {
    type: UPDATE_VIEW_MODE,
    viewMode
  };
}

export function maximizePanel(panelId) {
  return {
    type: UPDATE_MAXIMIZED_PANEL_ID,
    maximizedPanelId: panelId
  };
}

export function minimizePanel() {
  return {
    type: UPDATE_MAXIMIZED_PANEL_ID,
    maximizedPanelId: undefined
  };
}

export function updateIsFullScreenMode(isFullScreenMode) {
  return {
    type: UPDATE_IS_FULL_SCREEN_MODE,
    isFullScreenMode
  };
}

export function updatePanel(panel) {
  return {
    type: UPDATE_PANEL,
    panel,
  };
}

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export function updatePanels(panels) {
  const panelsMap = {};
  panels.forEach(panel => {
    panelsMap[panel.panelIndex] = panel;
  });
  return {
    type: UPDATE_PANELS,
    panels: panelsMap,
  };
}

/**
 *
 * @param embeddableHandler {EmbeddableHandler}
 * @param panelElement {Node}
 * @param panelId {string}
 * @param containerApi {ContainerAPI}
 * @return {function(*, *)}
 */
export function renderEmbeddable(embeddableHandler, panelElement, panelId, containerApi) {
  return (dispatch, getState) => {
    const { dashboardState } = getState();
    const panelState = dashboardState.panels[panelId];

    if (!embeddableHandler) {
      dispatch(embeddableRenderError(panelId, new Error(`Invalid embeddable type "${panelState.type}"`)));
      return;
    }

    dispatch(embeddableRenderRequested(panelId));
    return embeddableHandler.render(panelElement, panelState, containerApi)
      .then(embeddable => {
        return dispatch(embeddableRenderFinished(panelId, embeddable));
      })
      .catch(error => {
        dispatch(embeddableRenderError(panelId, error));
      });
  };
}

