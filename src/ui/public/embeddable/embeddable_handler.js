/**
 * The EmbeddableHandler defines how to render and embed any object into the Dashboard, or some other
 * container that supports EmbeddableHandlers.
 */
export class EmbeddableHandler {
  /**
   * @param {string} panelId - the id of the panel to grad the title for.
   * @return {string} a path that dictates where the user will be navigated to when they click the edit icon.
   */
  getEditPath(/* panelId */) {
    throw new Error('Must implement getEditPath.');
  }

  /**
   * @param {string} panelId - the id of the panel to grad the title for.
   * @return {string} - the title to display for this particular panel.
   */
  getTitleFor(/* panelId */) {
    throw new Error('Must implement getTitleFor.');
  }

  /**
   * @param {Element} domNode - the dom node to mount the rendered embeddable on
   * @param {Object} panel - a panel object which container information about the panel. Can also be modified to
   * store per panel information.
   * @property {string} panel.id - an id to specify the object that this panel contains.
   * @property {string} panel.type - specifies which EmbeddableHandler should render this panel.
   * @property {number} panel.panelIndex - a unique identifier for this panel in a specific container. Different
   * from panel.id because you can have the same object rendered multiple times in two different panels.
   * @param {Object} container - Contains functions to communicate with the container.
   */
  render(/* domNode, panel, container */) {
    throw new Error('Must implement render.');
  }
}
