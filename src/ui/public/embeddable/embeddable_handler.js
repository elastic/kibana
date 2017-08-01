/**
 * The EmbeddableHandler defines how to render and embed any object into the Dashboard, or some other
 * container that supports EmbeddableHandlers.
 */
export class EmbeddableHandler {
  /**
   * @param {string} panelId - the id of the panel to grab the title for.
   * @return {Promise.<string>} a promise that resolves with the path that dictates where the user will be navigated to
   * when they click the edit icon.
   */
  async getEditPath(/* panelId */) {
    throw new Error('Must implement getEditPath.');
  }

  /**
   * @param {string} panelId - the id of the panel to grab the title for.
   * @return {Promise.<string>} - Promise that resolves with the title to display for the particular panel.
   */
  async getTitleFor(/* panelId */) {
    throw new Error('Must implement getTitleFor.');
  }

  /**
   * @param {Element} domNode - the dom node to mount the rendered embeddable on
   * @param {PanelState} panel - a panel object which container information about the panel. Can also be modified to
   * store per panel information.
   * @property {string} panel.id - an id to specify the object that this panel contains.
   * @property {string} panel.type - specifies which EmbeddableHandler should render this panel.
   * @property {number} panel.panelIndex - a unique identifier for this panel in a specific container. Different
   * from panel.id because you can have the same object rendered multiple times in two different panels.
   * @param {Promise.<void>} A promise that resolves when the object is finished rendering.
   */
  async render(/* domNode, panel, container */) {
    Promise.reject(new Error('Must implement render.'));
  }
}
