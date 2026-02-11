/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const esql = getService('esql');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  describe('ES|QL UX examples', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        enableESQL: true,
      });
      await common.navigateToApp('esql_ux_example');

      await esql.waitESQLEditorLoaded();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    loadTestFile(require.resolve('./esql_editor_autocomplete'));
    loadTestFile(require.resolve('./esql_editor_ui'));
  });
}
