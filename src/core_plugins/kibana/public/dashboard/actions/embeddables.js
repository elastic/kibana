import { createAction } from 'redux-actions';

export const destroyEmbeddable =
  createAction('DESTROY_EMBEDDABLE', (panelId, embeddableHandler) => {
    if (embeddableHandler) {
      embeddableHandler.destroy(panelId);
    }
    return panelId;
  });

export const embeddableRenderFinished =
  createAction('EMBEDDABLE_RENDER_FINISHED', (panelId, embeddable) => ({ embeddable, panelId }));

export const embeddableRenderError =
  createAction('EMBEDDABLE_RENDER_ERROR', (panelId, error) => ({ panelId, error }));

/**
 *
 * @param embeddableHandler {EmbeddableHandler}
 * @param panelElement {Node}
 * @param panel {PanelState}
 * @param containerApi {ContainerAPI}
 * @return {function(*, *)}
 */
export function renderEmbeddable(embeddableHandler, panelElement, panel, containerApi) {
  return (dispatch) => {
    if (!embeddableHandler) {
      dispatch(embeddableRenderError(panel.panelIndex, new Error(`Invalid embeddable type "${panel.type}"`)));
      return;
    }

    return embeddableHandler.render(panelElement, panel, containerApi)
      .then(embeddable => {
        return dispatch(embeddableRenderFinished(panel.panelIndex, embeddable));
      })
      .catch(error => {
        dispatch(embeddableRenderError(panel.panelIndex, error));
      });
  };
}
