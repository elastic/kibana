import { workpad } from './workpad';
import { socketApi } from './socket';
import { translate } from './translate';

export function routes(server) {
  workpad(server);
  socketApi(server);
  translate(server);
}
