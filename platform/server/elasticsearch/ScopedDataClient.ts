import { Client } from 'elasticsearch';
import { Headers } from '../http/Router/headers';

//export class ScopedDataClient extends DataClient {
export class ScopedDataClient {
  constructor(
    private readonly client: Client,
    headers: Headers,
  ) {
  }

  call(endpoint: string, clientParams = {}, options = {}): any {
    // TODO: use this.headers
    return this.client.search({});
  }
}
