/**
 * @typedef {Object} MetadataState
 * @property {string|undefined} title
 * @property {string|undefined} description
 */

/**
 * @param metadata {MetadataState}
 * @return {string|undefined}
 */
export const getTitle = metadata => metadata.title;
/**
 * @param metadata {MetadataState}
 * @return {string|undefined}
 */
export const getDescription = metadata => metadata.description;
