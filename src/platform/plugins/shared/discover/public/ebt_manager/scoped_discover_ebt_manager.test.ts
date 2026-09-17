/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { TabsEventName, type TabsEBTEvent } from '@kbn/unified-tabs';
import { type DiscoverEBTContextProps, DiscoverEBTManager } from '.';
import { TABS_EVENT_TYPE } from './discover_ebt_manager_registrations';

describe('ScopedDiscoverEBTManager', () => {
  const coreSetupMock = coreMock.createSetup();

  let ebtManager: DiscoverEBTManager;

  beforeEach(() => {
    ebtManager = new DiscoverEBTManager();
    (coreSetupMock.analytics.reportEvent as jest.Mock).mockClear();
  });

  const createInitializedScopedManager = () => {
    ebtManager.initialize({
      core: coreSetupMock,
      discoverEbtContext$: new BehaviorSubject<DiscoverEBTContextProps>({ discoverProfiles: [] }),
    });

    return ebtManager.createScopedEBTManager();
  };

  describe('trackTabsEvent', () => {
    // One payload per event the tabs bar emits. Their shapes differ — only the close events carry
    // counts, only a switch carries indices — and every field has to survive the hand-off to EBT.
    const tabsEvents: TabsEBTEvent[] = [
      { eventName: TabsEventName.tabCreated, tabId: 'tab1', totalTabsOpen: 1 },
      {
        eventName: TabsEventName.tabClosed,
        tabId: 'tab2',
        totalTabsOpen: 2,
        remainingTabsCount: 1,
      },
      {
        eventName: TabsEventName.tabSwitched,
        tabId: 'tab1',
        totalTabsOpen: 2,
        fromIndex: 1,
        toIndex: 0,
      },
      { eventName: TabsEventName.tabDuplicated, tabId: 'tab1', totalTabsOpen: 1 },
      {
        eventName: TabsEventName.tabClosedOthers,
        tabId: 'tab3',
        totalTabsOpen: 3,
        closedTabsCount: 2,
      },
      {
        eventName: TabsEventName.tabClosedToTheRight,
        tabId: 'tab1',
        totalTabsOpen: 3,
        closedTabsCount: 2,
        remainingTabsCount: 1,
      },
      { eventName: TabsEventName.tabRenamed, tabId: 'tab1', totalTabsOpen: 1 },
    ];

    it.each(tabsEvents)('should report a $eventName event', (tabsEvent) => {
      createInitializedScopedManager().trackTabsEvent(tabsEvent);

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(TABS_EVENT_TYPE, tabsEvent);
    });

    it('should not report anything before the manager is initialized', () => {
      ebtManager.createScopedEBTManager().trackTabsEvent({
        eventName: TabsEventName.tabCreated,
        tabId: 'tab1',
        totalTabsOpen: 1,
      });

      expect(coreSetupMock.analytics.reportEvent).not.toHaveBeenCalled();
    });
  });
});
