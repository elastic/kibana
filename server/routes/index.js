import { translate } from './translate';
import { socketApi } from './socket';
export function routes(server) {
  translate(server);
  socketApi(server);
}
