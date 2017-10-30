/**
 * @typedef {Object} EmbeddableState
 * @property {string} title
 * @property {string} editUrl
 * @property {string|object} error
 */

/**
 * @param embeddable {Embeddable}
 * @return {string}
 */
export const getTitle = embeddable => embeddable.title;
/**
 * @param embeddable {Embeddable}
 * @return {string}
 */
export const getEditUrl = embeddable => embeddable.editUrl;
/**
 * @param embeddable {Embeddable}
 * @return {string}
 */
export const getError = embeddable => embeddable.error;
