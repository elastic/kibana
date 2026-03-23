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
  const { common, discover, unifiedFieldList, dashboard, header, timePicker, unifiedTabs } =
    getPageObjects([
      'common',
      'discover',
      'unifiedFieldList',
      'dashboard',
      'header',
      'timePicker',
      'unifiedTabs',
    ]);
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const queryBar = getService('queryBar');
  const monacoEditor = getService('monacoEditor');
  const ebtUIHelper = getService('kibana_ebt_ui');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('telemetry', () => {
    describe('context', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
        );
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
      });

      it('should set EBT context for telemetry events with default profile', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-* | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['performance_metric'],
          withTimeoutMs: 500,
        });

        expect(events[events.length - 1].context.discoverProfiles).to.eql([
          'example-root-profile',
          'default-data-source-profile',
        ]);
      });

      it('should set EBT context for telemetry events when example profile and reset', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-logs | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true);
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['performance_metric'],
          withTimeoutMs: 500,
        });

        expect(events[events.length - 1].context.discoverProfiles).to.eql([
          'example-root-profile',
          'example-data-source-profile',
        ]);

        // should reset the profiles when navigating away from Discover
        await testSubjects.click('logo');
        await retry.waitFor('home page to open', async () => {
          return (await testSubjects.getVisibleText('euiBreadcrumb')) === 'Home';
        });
        await testSubjects.click('addSampleData');

        await retry.try(async () => {
          const eventsAfter = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
            eventTypes: ['click'],
            withTimeoutMs: 500,
          });

          expect(eventsAfter[eventsAfter.length - 1].context.discoverProfiles).to.eql([]);
        });
      });

      it('should not set EBT context for embeddables', async () => {
        await dashboard.navigateToApp();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultAbsoluteRange();
        await ebtUIHelper.setOptIn(true);
        await dashboardAddPanel.addSavedSearch('A Saved Search');
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        const rows = await dataGrid.getDocTableRows();
        expect(rows.length).to.be.above(0);
        await dashboardAddPanel.openAddPanelFlyout();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['click'],
          withTimeoutMs: 500,
        });

        expect(
          events.length > 0 &&
            events.every((event) => !(event.context.discoverProfiles as string[])?.length)
        ).to.be(true);
      });
    });

    describe('contextual profiles', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
        );
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );
      });

      it('should send EBT events when a different data source profile gets resolved', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.waitUntilSearchingHasFinished();
        await monacoEditor.setCodeEditorValue('from my-example-logs | sort @timestamp desc');
        await ebtUIHelper.setOptIn(true); // starts the recording of events from this moment
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        let events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_profile_resolved'],
          withTimeoutMs: 500,
        });

        // root profile stays the same as it's not changing after switching to ES|QL mode

        // but the data source profile should change because of the different data source
        expect(events[0].properties).to.eql({
          contextLevel: 'dataSourceLevel',
          profileId: 'example-data-source-profile',
        });

        // should not trigger any new events after a simple refresh
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_profile_resolved'],
          withTimeoutMs: 500,
        });

        expect(events.length).to.be(1);

        // should detect a new data source profile when switching to a different data source
        await monacoEditor.setCodeEditorValue('from my-example-* | sort @timestamp desc');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_profile_resolved'],
          withTimeoutMs: 500,
        });

        expect(events[1].properties).to.eql({
          contextLevel: 'dataSourceLevel',
          profileId: 'default-data-source-profile',
        });

        expect(events.length).to.be(2);
      });

      it('should send EBT events when a different document profile gets resolved', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue('from my-example-* | sort @timestamp desc');
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await ebtUIHelper.setOptIn(true); // starts the recording of events from this moment

        // should trigger a new event after opening the doc viewer
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const events = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_profile_resolved'],
          withTimeoutMs: 500,
        });

        expect(events.length).to.be(1);

        expect(events[0].properties).to.eql({
          contextLevel: 'documentLevel',
          profileId: 'default-document-profile',
        });
      });
    });

    describe('field usage events', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
      });

      it('should track field usage when a field is added to the table', async () => {
        await dataViews.switchToAndValidate('my-example-*');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await ebtUIHelper.setOptIn(true);
        await unifiedFieldList.clickFieldListItemAdd('service.name');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: 'service.name',
        });

        await unifiedFieldList.clickFieldListItemAdd('_score');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [_, event2] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event2.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: '<non-ecs>',
        });
      });

      it('should track field usage when a field is removed from the table', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await ebtUIHelper.setOptIn(true);
        await unifiedFieldList.clickFieldListItemRemove('log.level');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'dataTableRemoval',
          fieldName: 'log.level',
        });
      });

      it('should track field usage when a filter is added', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await ebtUIHelper.setOptIn(true);
        await dataGrid.clickCellFilterForButtonExcludingControlColumns(0, 0);
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: '@timestamp',
          filterOperation: '+',
        });

        await unifiedFieldList.clickFieldListExistsFilter('log.level');

        const [_, event2] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event2.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: 'log.level',
          filterOperation: '_exists_',
        });
      });

      it('should track field usage for doc viewer too', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await ebtUIHelper.setOptIn(true);

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        // event 1
        await dataGrid.clickFieldActionInFlyout('service.name', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 2
        await dataGrid.clickFieldActionInFlyout('log.level', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 3
        await dataGrid.clickFieldActionInFlyout('log.level', 'addFilterOutValueButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        const [event1, event2, event3] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event1.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: 'service.name',
        });

        expect(event2.properties).to.eql({
          eventName: 'dataTableRemoval',
          fieldName: 'log.level',
        });

        expect(event3.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: 'log.level',
          filterOperation: '-',
        });
      });

      it('should track field usage on surrounding documents page', async () => {
        await dataViews.switchToAndValidate('my-example-logs');
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await dataGrid.clickRowToggle({ rowIndex: 1 });
        await discover.isShowingDocViewer();

        const [, surroundingActionEl] = await dataGrid.getRowActions();
        await surroundingActionEl.click();
        await header.waitUntilLoadingHasFinished();
        await ebtUIHelper.setOptIn(true);

        await dataGrid.clickRowToggle({ rowIndex: 0 });
        await discover.isShowingDocViewer();

        // event 1
        await dataGrid.clickFieldActionInFlyout('service.name', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 2
        await dataGrid.clickFieldActionInFlyout('log.level', 'toggleColumnButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        // event 3
        await dataGrid.clickFieldActionInFlyout('log.level', 'addFilterOutValueButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        const [event1, event2, event3] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_field_usage'],
          withTimeoutMs: 500,
        });

        expect(event1.properties).to.eql({
          eventName: 'dataTableSelection',
          fieldName: 'service.name',
        });

        expect(event2.properties).to.eql({
          eventName: 'dataTableRemoval',
          fieldName: 'log.level',
        });

        expect(event3.properties).to.eql({
          eventName: 'filterAddition',
          fieldName: 'log.level',
          filterOperation: '-',
        });

        expect(event3.context.discoverProfiles).to.eql([
          'example-root-profile',
          'example-data-source-profile',
        ]);
      });
    });

    describe('trackSubmittingQuery telemetry', () => {
      beforeEach(async () => {
        await discover.resetQueryMode();
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await ebtUIHelper.setOptIn(true);
      });

      it('should track field usage for KQL queries', async () => {
        await queryBar.setQuery('agent.name: "java" and log.level : "debug"');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_query_fields_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'kqlQuery',
          fieldNames: ['agent.name', 'log.level'],
        });
      });

      it('should track field usage for ES|QL queries', async () => {
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(
          'from my-example-* | where agent.name == "java" and log.level == "debug"'
        );
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_query_fields_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'esqlQuery',
          fieldNames: ['agent.name', 'log.level'],
        });
      });

      it('should track field usage for KQL queries embedded in ES|QL queries', async () => {
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(
          'from my-example-* | where agent.name == "java" and KQL("""log.level:"debug" """)'
        );
        await testSubjects.click('querySubmitButton');
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_query_fields_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'esqlQuery',
          fieldNames: ['agent.name', 'log.level'],
        });
      });

      it('should track free text search as __FREE_TEXT__ placeholder', async () => {
        await queryBar.setQuery('error occurred');
        await queryBar.submitQuery();
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_query_fields_usage'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'kqlQuery',
          fieldNames: ['__FREE_TEXT__'],
        });
      });
    });

    describe('trackTabs telemetry', () => {
      beforeEach(async () => {
        await common.navigateToApp('discover');
        await discover.waitUntilTabIsLoaded();
        await ebtUIHelper.setOptIn(true);
      });

      it('should track tabCreated event', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_tabs'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'tabCreated',
          totalTabsOpen: 1,
          tabId: event.properties.tabId,
        });
      });

      it('should track tabClosed event', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.closeTab(1);
        await discover.waitUntilTabIsLoaded();

        const [_createTabEvent, closeTabEvent] = await ebtUIHelper.getEvents(
          Number.MAX_SAFE_INTEGER,
          {
            eventTypes: ['discover_tabs'],
            withTimeoutMs: 500,
          }
        );

        expect(closeTabEvent.properties).to.eql({
          eventName: 'tabClosed',
          totalTabsOpen: 2,
          remainingTabsCount: 1,
          tabId: closeTabEvent.properties.tabId,
        });
      });

      it('should track tabSwitched event', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();

        const [_createTabEvent, switchTabEvent] = await ebtUIHelper.getEvents(
          Number.MAX_SAFE_INTEGER,
          {
            eventTypes: ['discover_tabs'],
            withTimeoutMs: 500,
          }
        );

        expect(switchTabEvent.properties).to.eql({
          eventName: 'tabSwitched',
          totalTabsOpen: 2,
          tabId: switchTabEvent.properties.tabId,
          fromIndex: 1,
          toIndex: 0,
        });
      });

      it('should track tabDuplicated event', async () => {
        await unifiedTabs.duplicateTab(0);
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_tabs'],
          withTimeoutMs: 500,
        });

        expect(event.properties).to.eql({
          eventName: 'tabDuplicated',
          totalTabsOpen: 1,
          tabId: event.properties.tabId,
        });
      });

      it('should track tabClosedOthers event', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.openTabMenu(2);
        await testSubjects.click('unifiedTabs_tabMenuItem_closeOtherTabs');
        await discover.waitUntilTabIsLoaded();

        const [_createTabEvent1, _createTabEvent2, closeOtherTabsEvent] =
          await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
            eventTypes: ['discover_tabs'],
            withTimeoutMs: 500,
          });

        expect(closeOtherTabsEvent.properties).to.eql({
          eventName: 'tabClosedOthers',
          totalTabsOpen: 3,
          closedTabsCount: 2,
          tabId: closeOtherTabsEvent.properties.tabId,
        });
      });

      it('should track tabClosedToTheRight event', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await unifiedTabs.openTabMenu(0);
        await testSubjects.click('unifiedTabs_tabMenuItem_closeTabsToTheRight');
        await discover.waitUntilTabIsLoaded();

        const [_createTabEvent1, _createTabEvent2, closeTabsToTheRightEvent] =
          await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
            eventTypes: ['discover_tabs'],
            withTimeoutMs: 500,
          });

        expect(closeTabsToTheRightEvent.properties).to.eql({
          eventName: 'tabClosedToTheRight',
          totalTabsOpen: 3,
          closedTabsCount: 2,
          remainingTabsCount: 1,
          tabId: closeTabsToTheRightEvent.properties.tabId,
        });
      });

      it('should track tabRenamed event', async () => {
        const newTitle = 'New tab title';
        await unifiedTabs.editTabLabel(0, newTitle);
        await discover.waitUntilTabIsLoaded();

        const [event] = await ebtUIHelper.getEvents(Number.MAX_SAFE_INTEGER, {
          eventTypes: ['discover_tabs'],
          withTimeoutMs: 500,
        });
        expect(event.properties).to.eql({
          eventName: 'tabRenamed',
          totalTabsOpen: 1,
          tabId: event.properties.tabId,
        });
      });
    });
  });
}
