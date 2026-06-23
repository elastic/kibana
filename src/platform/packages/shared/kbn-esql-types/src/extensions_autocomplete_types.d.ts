import type { KibanaProject } from '@kbn/projects-solutions-groups';
/**
 * Identifier for the classic (non-solution) view.
 * Items registered under this ID are visible in all views, regardless of the active solution.
 */
export declare const ESQL_CLASSIC_SOLUTION_ID: "classic";
/**
 * Extended solution ID type used by the extensions registry.
 * Includes the standard Kibana solution project types plus 'classic'
 * for items that should be available outside of (and across) all solutions.
 */
export type ESQLRegistrySolutionId = KibanaProject | typeof ESQL_CLASSIC_SOLUTION_ID;
export interface RecommendedQuery {
    name: string;
    query: string;
    description?: string;
    isStandalone?: boolean;
}
export interface RecommendedField {
    name: string;
    pattern: string;
}
