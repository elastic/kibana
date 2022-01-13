/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';

const cache = new WeakMap<KibanaClient, number>();

export async function getEsMajorVersion(client: KibanaClient) {
  const cached = cache.get(client);
  if (cached !== undefined) {
    return cached;
  }

  const stats = await client.info();
  const major = parseInt(stats.body.version.number.split('.')[0], 10);

  // eslint-disable-next-line no-console
  console.log(
    '>>>>>>>>>> Identified es major version as',
    major,
    'by inspecting cluster info',
    stats.body
  );

  cache.set(client, major);
  return major;
}
