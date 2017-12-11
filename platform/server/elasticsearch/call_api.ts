import { get } from 'lodash';
import { Client } from 'elasticsearch';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

export async function callAPI(
  client: Client,
  endpoint: string,
  clientParams: CallAPIClientParams,
  options: CallAPIOptions,
) {
  const wrap401Errors = options.wrap401Errors !== false;
  const clientPath = endpoint.split('.');
  const api: any = get(client, clientPath);

  if (api === undefined) {
    throw new Error(`called with an invalid endpoint: ${endpoint}`);
  }

  const apiContext = (clientPath.length === 1) ? client : get(client, clientPath.slice(0, -1));

  try {

    return await api.call(apiContext, clientParams);

  } catch (err) {

    if (wrap401Errors && err.statusCode === 401) {

      // TODO: decide on using homegrown error lib or boom
      // https://github.com/elastic/kibana/issues/12464

      err.wrap401Errors = true;
      throw err;
    }

    throw err;
  }
}
