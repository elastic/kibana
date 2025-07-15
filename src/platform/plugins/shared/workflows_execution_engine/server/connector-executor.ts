import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import { connectors } from './mock';

export class ConnectorExecutor {
  constructor(
    private connectorCredentials: Record<string, any>,
    private actionsClient: IUnsecuredActionsClient
  ) {}

  public async execute(
    connectorType: string,
    connectorName: string,
    inputs: Record<string, any>
  ): Promise<any> {
    if (!connectorType) {
      throw new Error('Connector type is required');
    }

    if (connectorType.endsWith('connector')) {
      await this.runConnector(connectorName, inputs);
      return;
    }

    const provider = connectors[connectorName];

    if (!provider) {
      throw new Error(`Connector "${connectorName}" not found`);
    }

    await provider.action(inputs);
  }

  private async runConnector(
    connectorName: string,
    connectorParams: Record<string, any>
  ): Promise<void> {
    const connectorCredentials = this.connectorCredentials['connector.' + connectorName];

    if (!connectorCredentials) {
      throw new Error(`Connector credentials for "${connectorName}" not found`);
    }

    const connectorId = connectorCredentials.id;

    await this.actionsClient.execute({
      id: connectorId,
      params: connectorParams,
      spaceId: 'default',
      requesterId: 'background_task', // This is a custom ID for testing purposes
    });
  }
}
