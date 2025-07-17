import { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';

export const extractConnectorIds = async (
  workflow: WorkflowExecutionEngineModel,
  actionsClient: IUnsecuredActionsClient
): Promise<Record<string, Record<string, any>>> => {
  const connectorNames = workflow.steps
    .filter((step) => step.type.endsWith('-connector'))
    .map((step) => step['connector-id']!);
  const distinctConnectorNames = Array.from(new Set(connectorNames));
  const allConnectors = await actionsClient.getAll('default');
  const connectorNameIdMap = new Map<string, string>(
    allConnectors.map((connector) => [connector.name, connector.id])
  );

  return distinctConnectorNames.reduce((acc, name) => {
    const connectorId = connectorNameIdMap.get(name);
    if (connectorId) {
      acc['connector.' + name] = {
        id: connectorId,
      };
    }
    return acc;
  }, {} as Record<string, Record<string, any>>);
};
