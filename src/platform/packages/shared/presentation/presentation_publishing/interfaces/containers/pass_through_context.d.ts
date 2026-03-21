import type { SerializableRecord } from '@kbn/utility-types';
/**
 * Allows the Presentation Container to provide generic untyped context to its children.
 *
 * For example, alerting page links to dashboards.
 * Linked dashboard panels should show the alert from alerting page.
 * The alerting page can use passThroughContext to pass '{ alert }' state to embeddables.
 * Embeddables can access passThroughContext from 'parentApi.getPassThroughContext()'
 * and use the state to show the alert from the alerting page.
 */
export interface PassThroughContext {
    getPassThroughContext: () => SerializableRecord | undefined;
}
/**
 * A type guard which can be used to determine if a given API supports PassThroughContext
 */
export declare const apiSupportsPassThroughContext: (api: unknown) => api is PassThroughContext;
