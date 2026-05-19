import type { ConnectorSpec } from '../connector_spec';
export interface SerializeConnectorSpecOptions {
    isPfxEnabled: boolean;
    isEarsEnabled: boolean;
}
export declare function serializeConnectorSpec(spec: ConnectorSpec, options?: SerializeConnectorSpecOptions): {
    metadata: import("../connector_spec").ConnectorMetadata;
    schema: Record<string, unknown>;
};
