import { socketApi } from './socket';
import { translate } from './translate';

export function routes(server) {
  socketApi(server);
  translate(server);
}
