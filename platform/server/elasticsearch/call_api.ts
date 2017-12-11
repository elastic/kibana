import { get, isEmpty } from 'lodash';
import { Client } from 'elasticsearch';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

export async function callAPI(
  client: Client,
  endpoint: string | string[],
  clientParams: CallAPIClientParams,
  options: CallAPIOptions,
) {
  const wrap401Errors = options.wrap401Errors !== false;
  // NB: I searched all x-pack and oss kibana code for callWithRequest
  //     All instances of endpoint appear to be dot-delimited strings
  const clientPath = (typeof endpoint === 'string') ? endpoint.split('.') : endpoint;
  const api: { call: (context: {}, params: {}) => Promise<any> } = get(client, clientPath);

  let apiContext = get(client, clientPath.slice(0, -1));
  if (isEmpty(apiContext)) {
    apiContext = client;
  }

  if (!api) {
    throw new Error(`called with an invalid endpoint: ${endpoint}`);
  }

  try {
    return await api.call(apiContext, clientParams);
  } catch (err) {
    if (!wrap401Errors || err.statusCode !== 401) {
      return err;
    }
    // TODO: decide on using homegrown error lib or boom
    //const boomError = Boom.boomify(err, { statusCode: err.statusCode });
    //const wwwAuthHeader = get(err, 'body.error.header[WWW-Authenticate]');
    //boomError.output.headers['WWW-Authenticate'] = wwwAuthHeader || 'Basic realm="Authorization Required"';

    //throw boomError;

    // TODO: this line is here because we need to return something
    // Should first fix the boom issue
    return err;
  }
}
