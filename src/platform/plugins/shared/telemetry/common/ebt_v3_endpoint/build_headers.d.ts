import type { BuildShipperHeaders } from '@elastic/ebt/shippers/elastic_v3/common';
/**
 * Returns the headers to send to the Remote Telemetry Service.
 * @param clusterUuid The UUID of the ES cluster.
 * @param version The version of the ES cluster.
 * @param licenseId The ID of the license (if available).
 */
export declare const buildShipperHeaders: BuildShipperHeaders;
