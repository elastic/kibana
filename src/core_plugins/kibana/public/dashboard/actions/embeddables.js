import { createAction } from 'redux-actions';

export const destroyEmbeddable = createAction('DESTROY_EMBEDDABLE',
  /**
   *
   * @param panelId {string}
   * @param embeddableFactory {EmbeddableFactory}
   * @return {string} - the panel id
   */
  (panelId, embeddableFactory) => {
    if (embeddableFactory) {
      embeddableFactory.destroy(panelId);
    }
    return panelId;
  }
);

export const embeddableRenderFinished = createAction('EMBEDDABLE_RENDER_FINISHED',
  /**
   * @param panelId {string}
   * @param embeddable {Embeddable}
   */
  (panelId, embeddable) => ({ embeddable, panelId })
);

export const embeddableRenderError = createAction('EMBEDDABLE_RENDER_ERROR',
  /**
   *
   * @param panelId {string}
   * @param error {string|object}
   */
  (panelId, error) => ({ panelId, error })
);

/**
 *
 * @param embeddableFactory {EmbeddableFactory}
 * @param panelElement {Node}
 * @param panel {PanelState}
 * @param containerApi {ContainerAPI}
 * @return {function(*, *)}
 */
export function renderEmbeddable(embeddableFactory, panelElement, panel, containerApi) {
  return (dispatch) => {
    if (!embeddableFactory) {
      dispatch(embeddableRenderError(panel.panelIndex, new Error(`Invalid embeddable type "${panel.type}"`)));
      return;
    }

    return embeddableFactory.render(panelElement, panel, containerApi)
      .then(embeddable => {
        return dispatch(embeddableRenderFinished(panel.panelIndex, embeddable));
      })
      .catch(error => {
        dispatch(embeddableRenderError(panel.panelIndex, error.message));
      });
  };
}
