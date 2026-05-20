import type { ConnectorSpec } from './connector_spec';
/**
 * Returns the ConnectorSpec for a given connector type ID, or undefined if not found.
 */
export declare function getConnectorSpec(connectorTypeId: string): ConnectorSpec | undefined;
