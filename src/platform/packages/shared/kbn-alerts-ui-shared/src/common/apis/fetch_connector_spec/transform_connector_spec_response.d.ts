import type { ConnectorMetadata } from '@kbn/connector-specs';
/**
 * Wire JSON from GET /internal/actions/connector_types/{id}/spec
 * (snake_case metadata; matches server `GetConnectorSpecResponseV1`).
 */
export interface ConnectorSpecWireResponse {
    metadata: {
        id: string;
        display_name: string;
        description: string;
        minimum_license: string;
        supported_feature_ids: string[];
        icon?: string;
        docs_url?: string;
        is_technical_preview?: boolean;
    };
    schema: Record<string, unknown>;
}
/** Client-side connector spec after normalising API casing. */
export interface ConnectorSpecResponse {
    metadata: ConnectorMetadata;
    schema: Record<string, unknown>;
}
export declare function transformConnectorSpecResponse(wire: ConnectorSpecWireResponse): ConnectorSpecResponse;
