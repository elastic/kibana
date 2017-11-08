import { workpad } from './workpad';
import { socketApi } from './socket';
import { translate } from './translate';
import { esFields } from './es_fields';
import { esIndices } from './es_indices';
import { runApi } from './run';
import { getAuth } from './get_auth';

export function routes(server) {
  runApi(server);
  workpad(server);
  socketApi(server);
  translate(server);
  esFields(server);
  esIndices(server);
  getAuth(server);
}
