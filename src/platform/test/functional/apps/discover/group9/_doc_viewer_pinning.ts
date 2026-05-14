/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const esql = getService('esql');
  const kibanaServer = getService('kibanaServer');
  const { common, discover, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
  ]);
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const queryBar = getService('queryBar');

  const pinnedDocTimeRange = {
    from: 'Sep 22, 2015 @ 22:00:00.000',
    to: 'Sep 22, 2015 @ 22:59:59.999',
  };

  const setPinnedDocTimeWindow = async () => {
    await timePicker.setAbsoluteRange(pinnedDocTimeRange.from, pinnedDocTimeRange.to);
    await discover.waitUntilTabIsLoaded();
  };

  const openDocViewerFlyout = async () => {
    await dataGrid.clickRowToggle();
    await dataGrid.waitForDocViewerFieldsToRender();
  };

  const expectExpandedDocState = async ({
    timestamp,
    clientIp,
    activePage,
    paginationHidden = false,
  }: {
    timestamp: string;
    clientIp: string;
    activePage?: number;
    paginationHidden?: boolean;
  }) => {
    await retry.try(async () => {
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      expect(await dataGrid.getDocViewerFieldValue('@timestamp')).to.be(timestamp);
      expect(await dataGrid.getDocViewerFieldValue('clientip')).to.be(clientIp);
      expect(await dataGrid.isDocViewerNavigationVisible()).to.be(!paginationHidden);

      if (!paginationHidden && activePage !== undefined) {
        expect(await dataGrid.getDocViewerActivePage()).to.be(activePage);
      }
    });
  };

  const submitClassicQuery = async (query: string) => {
    await queryBar.setQuery(query);
    await queryBar.clickQuerySubmitButton();
    await discover.waitUntilTabIsLoaded();
  };

  const switchToEsqlMode = async () => {
    await discover.selectTextBaseLang();
    await discover.waitUntilTabIsLoaded();
    await unifiedFieldList.waitUntilSidebarHasLoaded();
  };

  const refreshEsqlQuery = async () => {
    await esql.submitEsqlEditorQuery();
    await discover.waitUntilTabIsLoaded();
    await unifiedFieldList.waitUntilSidebarHasLoaded();
  };

  const submitEsqlQuery = async (query: string) => {
    await esql.setEsqlEditorQuery(query);
    await refreshEsqlQuery();
  };

  const buildPinnedDocEsqlQuery = ({
    metadataFields = [],
    extensionFilter = '== "jpg"',
    sortDirection = 'DESC',
  }: {
    metadataFields?: string[];
    extensionFilter?: string;
    sortDirection?: 'ASC' | 'DESC';
  }) => {
    const keepFields = ['@timestamp', 'clientip', 'extension', ...metadataFields];
    const metadataClause = metadataFields.length ? ` METADATA ${metadataFields.join(', ')}` : '';

    return [
      `FROM logstash-*${metadataClause}`,
      `| WHERE extension ${extensionFilter}`,
      `| SORT @timestamp ${sortDirection}`,
      `| KEEP ${keepFields.join(', ')}`,
    ].join(' ');
  };

  describe('discover doc viewer pinning', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await browser.setWindowSize(1600, 1200);
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async () => {
      await common.navigateToApp('discover');
      await discover.waitUntilTabIsLoaded();
    });

    it('should keep the expanded classic document pinned when results reorder or exclude it', async () => {
      await setPinnedDocTimeWindow();
      await submitClassicQuery('extension : "jpg"');

      await openDocViewerFlyout();

      const timestamp = await dataGrid.getDocViewerFieldValue('@timestamp');
      const clientIp = await dataGrid.getDocViewerFieldValue('clientip');

      await expectExpandedDocState({ timestamp, clientIp, activePage: 0 });

      await dataGrid.clickDocSortAsc('@timestamp');
      await discover.waitUntilTabIsLoaded();

      await expectExpandedDocState({ timestamp, clientIp, activePage: 4 });

      await submitClassicQuery('extension : ("css" or "gif" or "png")');

      await expectExpandedDocState({ timestamp, clientIp, paginationHidden: true });
    });

    it('should keep the expanded ES|QL result with METADATA _id, _index pinned when results reorder or exclude it', async () => {
      await setPinnedDocTimeWindow();
      await switchToEsqlMode();

      await submitEsqlQuery(buildPinnedDocEsqlQuery({ metadataFields: ['_id', '_index'] }));

      await openDocViewerFlyout();

      const timestamp = await dataGrid.getDocViewerFieldValue('@timestamp');
      const clientIp = await dataGrid.getDocViewerFieldValue('clientip');

      await expectExpandedDocState({ timestamp, clientIp, activePage: 0 });

      await submitEsqlQuery(
        buildPinnedDocEsqlQuery({
          metadataFields: ['_id', '_index'],
          sortDirection: 'ASC',
        })
      );

      await expectExpandedDocState({ timestamp, clientIp, activePage: 4 });

      await submitEsqlQuery(
        buildPinnedDocEsqlQuery({
          metadataFields: ['_id', '_index'],
          extensionFilter: '!= "jpg"',
        })
      );

      await expectExpandedDocState({ timestamp, clientIp, paginationHidden: true });
    });

    [
      {
        description: 'only METADATA _id is selected',
        metadataFields: ['_id'],
      },
      {
        description: 'only METADATA _index is selected',
        metadataFields: ['_index'],
      },
      {
        description: 'no METADATA fields are selected',
        metadataFields: [],
      },
    ].forEach(({ description, metadataFields }) => {
      it(`should keep the expanded ES|QL result pinned and hide navigation after refresh when ${description}`, async () => {
        await setPinnedDocTimeWindow();
        await switchToEsqlMode();

        const query = buildPinnedDocEsqlQuery({ metadataFields });
        await submitEsqlQuery(query);

        await openDocViewerFlyout();

        const timestamp = await dataGrid.getDocViewerFieldValue('@timestamp');
        const clientIp = await dataGrid.getDocViewerFieldValue('clientip');

        await expectExpandedDocState({ timestamp, clientIp, activePage: 0 });

        await refreshEsqlQuery();

        await expectExpandedDocState({ timestamp, clientIp, paginationHidden: true });
      });
    });
  });
}
