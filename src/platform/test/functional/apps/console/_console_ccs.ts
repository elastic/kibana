/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const remoteEsArchiver = getService('remoteEsArchiver' as 'esArchiver');
  const remoteEs = getService('remoteEs' as 'es');
  const UNICODE_INDEX = 'makelogs工程-ccs';

  describe('Console App CCS', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      await remoteEsArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      // resize the editor to allow the whole of the response to be displayed
      await browser.setWindowSize(1200, 1800);
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
    });

    after(async () => {
      await remoteEsArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await remoteEs.indices.delete({ index: UNICODE_INDEX }, { ignore: [404] });
    });

    describe('Perform CCS Search in Console', () => {
      it('it should be able to access remote data', async () => {
        await PageObjects.console.enterText(
          '\nGET ftr-remote:logstash-*/_search\n {\n "query": {\n "bool": {\n "must": [\n {"match": {"extension" : "jpg"} \n}\n]\n}\n}\n}'
        );
        await PageObjects.console.clickPlayAndWaitForResults();

        await retry.try(async () => {
          const actualResponse = await PageObjects.console.getOutputText();
          expect(actualResponse).to.contain('"_index": "ftr-remote:logstash-2015.09.20"');
        });
      });

      it('it should be able to access remote data from an index with a non-ASCII name', async () => {
        await remoteEs.index({
          index: UNICODE_INDEX,
          document: { extension: 'jpg' },
          refresh: 'wait_for',
        });
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText(
          `\nGET ftr-remote:${UNICODE_INDEX}*/_search\n {\n "query": {\n "bool": {\n "must": [\n {"match": {"extension" : "jpg"} \n}\n]\n}\n}\n}`
        );
        await PageObjects.console.clickPlayAndWaitForResults();

        await retry.try(async () => {
          const actualResponse = await PageObjects.console.getOutputText();
          expect(actualResponse).to.contain(`"_index": "ftr-remote:${UNICODE_INDEX}"`);
        });
      });
    });
  });
}
