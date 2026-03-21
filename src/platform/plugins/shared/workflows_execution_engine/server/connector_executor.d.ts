import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
export declare class ConnectorExecutor {
    private actionsClient;
    constructor(actionsClient: ActionsClient);
    execute(params: {
        connectorType: string;
        connectorNameOrId: string;
        input: Record<string, unknown>;
        abortController: AbortController;
    }): Promise<ActionTypeExecutorResult<unknown>>;
    executeSystemConnector(params: {
        connectorType: string;
        input: Record<string, unknown>;
        abortController: AbortController;
    }): Promise<ActionTypeExecutorResult<unknown>>;
    private runConnector;
    private createAbortError;
    private resolveConnectorId;
}
