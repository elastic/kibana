import supertest from 'supertest-as-promised';
import { format as formatUrl } from 'url';

import serverConfig from '../../../../../../../test/server_config';

export function createScopedSuperTest() {
  return supertest(formatUrl(serverConfig.servers.kibana) + '/api');
}
