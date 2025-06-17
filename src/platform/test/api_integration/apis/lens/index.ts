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
  describe('lens - nick', () => {
    loadTestFile(require.resolve('./visualizations/create'));
    loadTestFile(require.resolve('./visualizations/get'));
    loadTestFile(require.resolve('./visualizations/update'));
    loadTestFile(require.resolve('./visualizations/delete'));
    loadTestFile(require.resolve('./visualizations/search'));
  });
}
