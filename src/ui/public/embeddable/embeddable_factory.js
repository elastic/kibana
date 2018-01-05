/**
 * The EmbeddableFactory renders an embeddable of a certain type at a given dom node.
 */
export class EmbeddableFactory {
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
    // Possible there is no destroy function mapped, for instance if there was an error thrown during render.
    if (this.destroyEmbeddableMap[panelIndex]) {
      this.destroyEmbeddableMap[panelIndex]();
      delete this.destroyEmbeddableMap[panelIndex];
    }
  }
}
