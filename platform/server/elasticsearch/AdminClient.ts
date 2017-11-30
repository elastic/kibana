import { Client } from 'elasticsearch';

export class AdminClient {
  constructor(
    private readonly client: Client,
  ) {
  }

  call(endpoint: string, clientParams = {}, options = {}): any {
    this.client.search({});
    return {};
  }
}

