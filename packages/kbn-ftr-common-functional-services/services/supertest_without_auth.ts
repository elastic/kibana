/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { FtrProviderContext } from './ftr_provider_context';

/**
 * Returns supertest.SuperTest<supertest.Test> instance that will not persist cookie between API requests.
 * If you need to pass certificate, do the following:
 * await supertestWithoutAuth
 *   .get('/abc')
 *   .ca(CA_CERT)
 */
export function SupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });

  return supertest(kbnUrl);
}
