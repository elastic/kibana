/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../services';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('from the server', () => {
    // Add tests for Server-instrumented events here:
    loadTestFile(require.resolve('./core_context_providers'));
    loadTestFile(require.resolve('./kibana_started'));
    loadTestFile(require.resolve('./core_overall_status_changed'));
  });
}
