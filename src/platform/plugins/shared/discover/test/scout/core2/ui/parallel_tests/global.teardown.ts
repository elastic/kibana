/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook as baseGlobalTeardownHook, mergeTests } from '@kbn/scout';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

const globalTeardownHookWithSynthtrace = mergeTests(baseGlobalTeardownHook, synthtraceFixture);

globalTeardownHookWithSynthtrace(
  'Teardown legacy log stream embeddable data',
  { tag: '@local-stateful-classic' },
  async ({ log, logsSynthtraceEsClient }) => {
    log.debug('[teardown:legacy_log_stream] cleaning synthtrace logs...');
    await logsSynthtraceEsClient.clean();
    log.debug('[teardown:legacy_log_stream] synthtrace logs cleaned');
  }
);
