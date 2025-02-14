/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('short_url', () => {
    loadTestFile(require.resolve('./create_short_url'));
    loadTestFile(require.resolve('./get_short_url'));
    loadTestFile(require.resolve('./delete_short_url'));
    loadTestFile(require.resolve('./resolve_short_url'));
  });
}
