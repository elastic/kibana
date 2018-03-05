import { createAction } from 'redux-actions';

import { getPanel } from '../../selectors/dashboard_selectors';

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
 * @param panelId {string}
 * @param containerApi {ContainerAPI}
 * @return {function(*, *)}
 */
export function renderEmbeddable(embeddableFactory, panelElement, panelId, containerApi) {
  return (dispatch, getState) => {
    const panelState = getPanel(getState(), panelId);

    if (!embeddableFactory) {
      dispatch(embeddableRenderError(panelId, new Error(`Invalid embeddable type "${panelState.type}"`)));
      return;
    }

    return embeddableFactory.render(panelElement, panelState, containerApi)
      .then(embeddable => {
        return dispatch(embeddableRenderFinished(panelId, embeddable));
      })
      .catch(error => {
        dispatch(embeddableRenderError(panelId, error.message));
      });
  };
}
