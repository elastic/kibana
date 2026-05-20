import type { IUiSettingsClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
export declare const createScopedModel: ({ inference, request, connectorId, }: {
    inference: InferenceServerStart;
    request: KibanaRequest;
    connectorId: string;
}) => Promise<ScopedModel>;
export declare const resolveConnectorId: ({ uiSettingsClient, inference, request, }: {
    uiSettingsClient: IUiSettingsClient;
    inference: InferenceServerStart;
    request: KibanaRequest;
}) => Promise<string | undefined>;
