/**
 * Type representing Elasticsearch specific portion of the role definition.
 */
export interface ElasticsearchPrivilegesType {
    cluster?: string[];
    remote_cluster?: Array<{
        privileges: string[];
        clusters: string[];
    }>;
    indices?: Array<{
        names: string[];
        field_security?: Record<'grant' | 'except', string[]>;
        privileges: string[];
        query?: string;
        allow_restricted_indices?: boolean;
    }>;
    remote_indices?: Array<{
        clusters: string[];
        names: string[];
        field_security?: Record<'grant' | 'except', string[]>;
        privileges: string[];
        query?: string;
        allow_restricted_indices?: boolean;
    }>;
    run_as?: string[];
}
/**
 * Type representing Kibana specific portion of the role definition.
 */
export type KibanaPrivilegesType = Array<{
    spaces: string[];
    base?: string[];
    feature?: Record<string, string[]>;
}>;
