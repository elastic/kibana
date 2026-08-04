import type { DocLinksStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
import type { ActionTypeModel } from '../types/action_types';
export type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
export declare function shouldHideWorkflowsOnlyConnector(supportedFeatureIds: string[], uiSettings?: IUiSettingsClient): boolean;
/**
 * Fetches a connector spec from the API.
 */
export declare function fetchConnectorSpec(http: HttpSetup, connectorTypeId: string, signal?: AbortSignal): Promise<ConnectorSpecResponse>;
/**
 * Transforms a ConnectorSpecResponse into an ActionTypeModel.
 *
 * This creates a model that can be used by the connector form components,
 * with dynamically generated form fields from the JSON schema.
 */
export declare function transformSpecToActionTypeModel(spec: ConnectorSpecResponse, docLinks: DocLinksStart, uiSettings?: IUiSettingsClient): ActionTypeModel;
