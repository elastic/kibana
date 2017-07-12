import { socketApi } from './socket';
import { translate } from './translate';
import { functions } from './functions';

export function routes(server) {
  socketApi(server);
  translate(server);
  functions(server);
}
