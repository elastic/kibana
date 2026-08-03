import type { DocLinksStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { ActionTypeModel, ActionTypeRegistryContract } from '../types';
export interface UseActionTypeModelResult {
    /** The action type model, either from registry or derived from spec */
    actionTypeModel: ActionTypeModel | null;
    /** Whether the spec is currently being fetched */
    isLoading: boolean;
    /** Error if fetching the spec failed */
    error: Error | null;
    /** Re-runs the connector spec query (no-op when the model is from the registry) */
    refetch: () => void;
}
/**
 * Hook to get an ActionTypeModel for a given action type id.
 *
 * For stack connectors (registered in the actionTypeRegistry), returns the model synchronously.
 * For spec-based connectors, fetches the spec from the API and transforms it into an ActionTypeModel.
 *
 * Routing is driven by the registry: if the connector type is registered, the registry model is
 * used; if not, the spec endpoint is tried as a fallback.
 */
export declare function useActionTypeModel({ actionTypeRegistry, actionTypeId, http, docLinks, uiSettings, }: {
    actionTypeRegistry: ActionTypeRegistryContract;
    actionTypeId: string | undefined;
    http: HttpSetup;
    docLinks: DocLinksStart;
    uiSettings?: IUiSettingsClient;
}): UseActionTypeModelResult;
