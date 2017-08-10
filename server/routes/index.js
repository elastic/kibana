import { workpad } from './workpad';
import { socketApi } from './socket';
import { translate } from './translate';
import { esFields } from './es_fields';

export function routes(server) {
  workpad(server);
  socketApi(server);
  translate(server);
  esFields(server);
}
