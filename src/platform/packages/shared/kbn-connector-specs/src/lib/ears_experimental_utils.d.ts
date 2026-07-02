import type { AuthTypeDef } from '../connector_spec';
export declare const isEarsExperimentalAuthType: (authType: string | AuthTypeDef) => authType is AuthTypeDef;
export declare const isEarsExperimentalConnector: (connectorTypeId: string) => boolean;
