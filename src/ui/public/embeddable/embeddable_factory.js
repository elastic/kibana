/**
 * @typedef {Object} EmbeddableState
 * @property {Object} personalization - any personalization data that should be stored at the panel level. For
 * example, pie slice colors, or custom per panel sort order or columns.
 * @property {Object} stagedFilter - a possible filter the embeddable wishes dashboard to apply.
 */


/**
 * @callback onEmbeddableStateChanged
 * @param {EmbeddableState} embeddableState
 */

/**
 * The EmbeddableFactory creates and initializes an embeddable instance
 */
export class EmbeddableFactory {
  /**
   *
   * @param {Object} containerMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param {onEmbeddableStateChanged} onEmbeddableStateChanged - embeddable should call this function with updated
   * state whenever something changes that the dashboard should know about.
   * @return {Promise.<Embeddable>}
   */
  create(/* containerMetadata, onEmbeddableStateChanged*/) {
    throw new Error('Must implement initialize.');
  }
}
