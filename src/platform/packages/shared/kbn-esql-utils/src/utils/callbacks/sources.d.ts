import type { CoreStart } from '@kbn/core/public';
import { type ESQLSourceResult } from '@kbn/esql-types';
import type { ILicense } from '@kbn/licensing-types';
/**
 * Fetches the list of indices, aliases, and data streams from the Elasticsearch cluster.
 * @param core The core start contract to make HTTP requests.
 * @param areRemoteIndicesAvailable A boolean indicating if remote indices should be included.
 * @param signal Optional AbortSignal to cancel the request.
 * @param projectRouting Optional CPS project routing value forwarded to the server so that index
 *   resolution reflects the project picker selection or an explicit `SET project_routing`
 *   pre-statement. `SET project_routing` takes precedence over the picker value.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
export declare const getIndicesList: (core: Pick<CoreStart, "http">, areRemoteIndicesAvailable: boolean, signal?: AbortSignal, projectRouting?: string) => Promise<ESQLSourceResult[]>;
/** Fetches ESQL sources including indices, aliases, data streams, and integrations.
 * @param core The core start contract to make HTTP requests and access application capabilities.
 * @param getLicense An optional function to retrieve the current license information.
 * @param enrichSources Optional function to enrich or transform the list of sources before
 *   returning them (e.g. to add stream descriptions, links, or custom types).
 * @param signal Optional AbortSignal to cancel the request.
 * @param projectRouting Optional CPS project routing value forwarded to the server so that index
 *   resolution reflects the project picker selection or an explicit `SET project_routing`
 *   pre-statement. `SET project_routing` takes precedence over the picker value.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
export declare const getESQLSources: (core: Pick<CoreStart, "application" | "http">, getLicense: (() => Promise<ILicense | undefined>) | undefined, enrichSources?: (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>, signal?: AbortSignal, projectRouting?: string) => Promise<ESQLSourceResult[]>;
