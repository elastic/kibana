/**
 * @typedef {Object} MetadataState
 * @property {string|undefined} title
 * @property {string|undefined} description
 */

/**
 * @param metadata {MetadataState}
 * @return {string|undefined}
 */
export const getTitle = dashboard => dashboard.title;
/**
 * @param metadata {DashboardState}
 * @return {string|undefined}
 */
export const getDescription = dashboard => dashboard.description;