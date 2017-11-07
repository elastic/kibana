import { createAction } from 'redux-actions';

export const embeddableRenderComplete = createAction('EMBEDDABLE_RENDER_COMPLETE');

export const destroyEmbeddable = createAction('DESTROY_EMBEDDABLE',
  /**
   *
   * @param panelId {string}
   * @param embeddableHandler {EmbeddableHandler}
   * @return {string} - the panel id
   */
  (panelId, embeddableHandler) => {
    if (embeddableHandler) {
      embeddableHandler.destroy(panelId);
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
 * Converts the returned Embeddable object supplied by the embeddable handler into something we want to store on
 * state.  We may need to store a cache of these somewhere so we can still have access to functionality.
 * @param embeddable{Embeddable}
 * @return embeddableState {EmbeddableState}
 */
function convertEmbeddableToState(embeddable) {
  return {
    title: embeddable.title,
    editUrl: embeddable.editUrl,
    renderComplete: false,
  };
}

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
        const embeddableState = convertEmbeddableToState(embeddable);

        embeddable.renderComplete.then(() => dispatch(embeddableRenderComplete(panel.panelIndex)));

        return dispatch(embeddableRenderFinished(panel.panelIndex, embeddableState));
      })
      .catch(error => {
        dispatch(embeddableRenderError(panel.panelIndex, error));
      });
  };
}
