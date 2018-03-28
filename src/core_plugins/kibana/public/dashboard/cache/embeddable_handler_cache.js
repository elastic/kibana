/**
 * Stores Embeddables returned by EmbeddableFactory.create calls.
 */
export class EmbeddableHandlerCache {
  constructor() {
    this.cache = {};
  }

  /**
   * Store a new embeddable in the cache
   * @param {string} panelId
   * @param {Embeddable} embeddable
   */
  register(panelId, embeddable) {
    this.cache[panelId] = embeddable;
  }

  /**
   * Destroys the embeddable and removes from the cache.
   * @param {string} panelId
   */
  destroy(panelId) {
    this.cache[panelId].destroy();
    delete this.cache[panelId];
  }

  /**
   *
   * @param {string} panelId
   * @return {EmbeddableMetadata}
   */
  getMetadata(panelId) {
    return this.cache[panelId].metadata;
  }

  /**
   * Tell the embeddable to mount and render itself at the given dom node.
   * @param {string} panelId
   * @param {Element} domNode
   */
  render(panelId, domNode) {
    this.cache[panelId].render(domNode);
  }

  /**
   * Notifies the embeddable with the given id that state on the dashboard and/or panel has changed.
   * @param {string} panelId
   * @param {ContainerState} containerState
   */
  onContainerStateChanged(panelId, containerState) {
    this.cache[panelId].onContainerStateChanged(containerState);
  }
}

export const embeddableHandlerCache = new EmbeddableHandlerCache();
