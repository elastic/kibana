/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';

export async function deleteDataStream(client: Client, datastream: string, template: string) {
  await client.indices.deleteDataStream({ name: datastream });
  await client.indices.deleteIndexTemplate({ name: template });
}
