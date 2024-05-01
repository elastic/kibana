/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmSynthtraceKibanaClient } from '../../lib/apm/client/apm_synthtrace_kibana_client';
import { Logger } from '../../lib/utils/create_logger';

export function getKibanaClient({ target, logger }: { target: string; logger: Logger }) {
  const kibanaClient = new ApmSynthtraceKibanaClient({
    logger,
    target,
  });

  return kibanaClient;
}
