/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ loadTestFile }: PluginFunctionalProviderContext) {
  describe('Saved Objects Management', function () {
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./scroll_count'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./export_transform'));
    loadTestFile(require.resolve('./import_warnings'));
    loadTestFile(require.resolve('./hidden_types'));
    loadTestFile(require.resolve('./visible_in_management'));
    loadTestFile(require.resolve('./hidden_from_http_apis'));
  });
}
