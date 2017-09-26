/**
 * The EmbeddableHandler defines how to render and embed any object into the Dashboard, or some other
 * container that supports EmbeddableHandlers.
 */
export class EmbeddableHandler {
  constructor() {
    this.destroyEmbeddableMap = {};
  }

  /**
   * @param {Element} domNode - the dom node to mount the rendered embeddable on
   * @param {PanelState} panel - a panel object which container information about the panel. Can also be modified to
   * store per panel information.
   * @property {ContainerApi} containerApi - an id to specify the object that this panel contains.
   * @param {Promise.<void>} A promise that resolves when the object is finished rendering.
   * @return {Promise.<Embeddable>} A promise that resolves to a function that should be used to destroy the
   * rendered embeddable.
   */
  render(/* domNode, panel, container */) {
    throw new Error('Must implement render.');
  }

  addDestroyEmeddable(panelIndex, destroyEmbeddable) {
    this.destroyEmbeddableMap[panelIndex] = destroyEmbeddable;
  }

  destroy(panelIndex) {
    this.destroyEmbeddableMap[panelIndex]();
    delete this.destroyEmbeddableMap[panelIndex];
  }
}
