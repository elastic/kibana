/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, loadTestFile }: FtrProviderContext) {
  const { spaceSettings } = getPageObjects(['common', 'spaceSettings']);

  describe('discover/observability', () => {
    before(async () => {
      await spaceSettings.switchSpaceSolutionType({
        spaceName: 'default',
        solution: 'oblt',
      });
    });

    after(async () => {
      await spaceSettings.switchSpaceSolutionType({
        spaceName: 'default',
        solution: 'classic',
      });
    });

    loadTestFile(require.resolve('./embeddable/_saved_search_embeddable'));
    loadTestFile(require.resolve('./logs/_get_pagination_config'));
    loadTestFile(require.resolve('./embeddable/_get_doc_viewer'));
    loadTestFile(require.resolve('./logs/_get_doc_viewer'));
  });
}
