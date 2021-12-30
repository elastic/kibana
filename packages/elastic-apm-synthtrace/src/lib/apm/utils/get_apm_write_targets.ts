/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ApmElasticsearchOutputWriteTargets } from './apm_events_to_elasticsearch_output';

export async function getApmWriteTargets({
  client,
}: {
  client: Client;
}): Promise<ApmElasticsearchOutputWriteTargets> {
  const targets = {
    transaction: "traces-apm-default",
    span: "traces-apm-default",
    metric: "metrics-apm.internal-default",
    error: "logs-apm.error-default",
  }
  if (!targets.transaction || !targets.span || !targets.metric || !targets.error) {
    throw new Error('Write targets could not be determined');
  }

  return targets;
}
