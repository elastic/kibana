import { createAction } from 'redux-actions';

export const deletePanel = createAction('DELETE_PANEL', panelId => panelId);

export const embeddableRenderFinished =
  createAction('EMBEDDABLE_RENDER_FINISHED', (panelId, embeddable) => ({ embeddable, panelId }));

export const embeddableRenderError =
  createAction('EMBEDDABLE_RENDER_ERROR', (panelId, error) => ({ panelId, error }));

export const updatePanel = createAction('UPDATE_PANEL', panel => panel);

/**
 * @param panels {Array<PanelState>}
 * @return {Object}
 */
export const updatePanels = createAction('UPDATE_PANELS', panels => {
  const panelsMap = {};
  panels.forEach(panel => {
    panelsMap[panel.panelIndex] = panel;
  });
  return panelsMap;
});

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

    return embeddableHandler.render(panelElement, panelState, containerApi)
      .then(embeddable => {
        return dispatch(embeddableRenderFinished(panelId, embeddable));
      })
      .catch(error => {
        dispatch(embeddableRenderError(panelId, error));
      });
  };
}
