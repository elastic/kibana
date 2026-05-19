/**
 * Checks for the compatibilitiy between Elasticsearch and Kibana versions
 * 1. Major version differences will never work together.
 * 2. Older versions of ES won't work with newer versions of Kibana.
 */
export declare function esVersionCompatibleWithKibana(esVersion: string, kibanaVersion: string): boolean;
export declare function esVersionEqualsKibana(nodeVersion: string, kibanaVersion: string): boolean | null;
