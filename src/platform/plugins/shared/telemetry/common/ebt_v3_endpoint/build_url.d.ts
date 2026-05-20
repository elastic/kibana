import type { BuildShipperUrl } from '@elastic/ebt/shippers/elastic_v3/common';
/**
 * Builds the URL for the V3 API.
 */
export declare const createBuildShipperUrl: (sendTo: "production" | "staging") => BuildShipperUrl;
