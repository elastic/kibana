/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import type { ReactNode } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import type { ParsedItem } from '@kbn/ui-react-assembly';
import type { FlyoutBodyProps } from '../types';
import { bodyAssembly, flyoutAssembly, partsOf } from '../assembly';
import {
  resolveZoneTestSubj,
  useFlyoutHeaderCollapse,
  useFlyoutTabs,
  useFlyoutTemplateConfig,
} from '../context';
import { TAB_PANEL_PART_NAME, TabPanel } from './tab_panel';

/** Renders passthrough children from pre-parsed items in source order. */
const renderBodyItems = (items: ParsedItem[]) =>
  items.map((item, index) =>
    item.type === 'child' ? <Fragment key={`passthrough-${index}`}>{item.node}</Fragment> : null
  );

/** Part name used for identifying the `Body` zone. */
export const BODY_PART_NAME = 'body';

const bodyPart = flyoutAssembly.definePart({ name: BODY_PART_NAME });

/** Declarative `FlyoutTemplate.Body`; the root renders the collected attributes. */
const BaseBody = bodyPart.createComponent<FlyoutBodyProps>();
BaseBody.displayName = 'FlyoutTemplate.Body';

export const Body = Object.assign(BaseBody, { TabPanel });

type BodyZoneProps = FlyoutBodyProps & {
  /** Pre-parsed body items from the root, to avoid parsing the children twice. */
  items: ParsedItem[];
};

/** Internal renderer for the body zone, with optional tab-panel mode. */
export const BodyZone = ({ items, 'data-test-subj': dataTestSubj }: BodyZoneProps) => {
  const { dataTestSubj: rootTestSubj } = useFlyoutTemplateConfig();
  const { tabs, selectedTabId } = useFlyoutTabs();
  const { scrollContainerRef } = useFlyoutHeaderCollapse();

  const tabPanelItems = partsOf(items, TAB_PANEL_PART_NAME);
  const isTabbedMode = tabPanelItems.length > 0;

  const bodyTestSubj = resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Body');

  if (isTabbedMode) {
    const seenPanelIds = new Set<string>();
    const uniquePanels = tabPanelItems.filter((panel) => {
      const tabId = panel.attributes.tabId as string;
      if (seenPanelIds.has(tabId)) return false;
      seenPanelIds.add(tabId);
      return true;
    });

    const activeTab = tabs.find((tab) => tab.id === selectedTabId);
    const activePanel = uniquePanels.find(
      (panel) => (panel.attributes.tabId as string) === activeTab?.id
    );

    if (!activeTab || !activePanel) {
      return (
        <EuiFlyoutBody data-test-subj={bodyTestSubj} scrollContainerRef={scrollContainerRef} />
      );
    }

    const panelChildren = activePanel.attributes.children as ReactNode;
    const activePanelContent = renderBodyItems(
      bodyAssembly.parseChildren(panelChildren, { supportsOtherChildren: true })
    );

    return (
      <KibanaErrorBoundaryProvider>
        <EuiFlyoutBody data-test-subj={bodyTestSubj} scrollContainerRef={scrollContainerRef}>
          <KibanaErrorBoundary>
            <div
              role="tabpanel"
              id={activeTab.panelDomId}
              aria-labelledby={activeTab.tabDomId}
              tabIndex={0}
              data-test-subj={activePanel.attributes['data-test-subj'] as string | undefined}
            >
              {activePanelContent}
            </div>
          </KibanaErrorBoundary>
        </EuiFlyoutBody>
      </KibanaErrorBoundaryProvider>
    );
  }

  return (
    <KibanaErrorBoundaryProvider>
      <EuiFlyoutBody data-test-subj={bodyTestSubj} scrollContainerRef={scrollContainerRef}>
        <KibanaErrorBoundary>{renderBodyItems(items)}</KibanaErrorBoundary>
      </EuiFlyoutBody>
    </KibanaErrorBoundaryProvider>
  );
};
