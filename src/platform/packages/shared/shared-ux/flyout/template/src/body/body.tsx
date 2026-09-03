/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import type { ParsedItem, ParsedPart } from '@kbn/ui-react-assembly';
import type { FlyoutTabDescriptor } from '../context/tabs_context';
import type { FlyoutBodyProps } from '../types';
import { bodyAssembly, flyoutAssembly, partsOf } from '../assembly';
import {
  resolveZoneTestSubj,
  useFlyoutHeaderCollapse,
  useFlyoutTabs,
  useFlyoutTemplateConfig,
} from '../context';
import { Accordion, ACCORDION_PART_NAME, accordionPart } from './accordion';
import { Section, SECTION_PART_NAME, sectionPart } from './section';
import { Subsection } from './subsection';
import { TAB_PANEL_PART_NAME, TabPanel } from './tab_panel';

/** Renders `Section`, `Accordion`, and unstructured children from pre-parsed items in source order. */
const renderBodyItems = (items: ParsedItem[]) =>
  items.map((item, index) => {
    if (item.type === 'child') {
      return <Fragment key={`passthrough-${index}`}>{item.node}</Fragment>;
    }
    // `instanceId` is only unique per part name, so a section and an accordion sharing an `id`
    // would collide as sibling keys.
    if (item.part === SECTION_PART_NAME) {
      return (
        <Fragment key={`${item.part}-${item.instanceId}`}>
          {sectionPart.resolve(item, undefined) ?? null}
        </Fragment>
      );
    }
    if (item.part === ACCORDION_PART_NAME) {
      return (
        <Fragment key={`${item.part}-${item.instanceId}`}>
          {accordionPart.resolve(item, undefined) ?? null}
        </Fragment>
      );
    }
    return null;
  });

const ActiveTabPanel = ({
  activeTab,
  activePanel,
  bodyTestSubj,
  scrollContainerRef,
}: {
  activeTab: FlyoutTabDescriptor;
  activePanel: ParsedPart;
  bodyTestSubj: string | undefined;
  scrollContainerRef: (node: HTMLElement | null) => void;
}) => {
  const panelChildren = activePanel.attributes.children as ReactNode;
  const content = useMemo(
    () =>
      renderBodyItems(bodyAssembly.parseChildren(panelChildren, { supportsOtherChildren: true })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePanel]
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
            {content}
          </div>
        </KibanaErrorBoundary>
      </EuiFlyoutBody>
    </KibanaErrorBoundaryProvider>
  );
};

/** Part name used for identifying the `Body` zone. */
export const BODY_PART_NAME = 'body';

const bodyPart = flyoutAssembly.definePart({ name: BODY_PART_NAME });

/** Declarative `FlyoutTemplate.Body`; the root renders the collected attributes. */
const BaseBody = bodyPart.createComponent<FlyoutBodyProps>();
BaseBody.displayName = 'FlyoutTemplate.Body';

export const Body = Object.assign(BaseBody, {
  Section: Object.assign(Section, { Subsection }),
  Accordion: Object.assign(Accordion, { Subsection }),
  TabPanel,
});

/** Internal renderer for the body zone, with optional tab-panel mode. */
export const BodyZone = ({ children, 'data-test-subj': dataTestSubj }: FlyoutBodyProps) => {
  const { dataTestSubj: rootTestSubj } = useFlyoutTemplateConfig();
  const { tabs, selectedTabId } = useFlyoutTabs();
  const items = useMemo(
    () => bodyAssembly.parseChildren(children, { supportsOtherChildren: true }),
    [children]
  );
  const { scrollContainerRef } = useFlyoutHeaderCollapse();

  const tabPanelItems = partsOf(items, TAB_PANEL_PART_NAME);
  const isTabbedMode = tabs.length > 0;

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

    if (!activeTab) {
      return (
        <EuiFlyoutBody data-test-subj={bodyTestSubj} scrollContainerRef={scrollContainerRef} />
      );
    }

    // Panel not yet supplied (e.g. on-demand mounting). Keep the tabpanel wrapper so the selected
    // tab's aria-controls points at a real element rather than dangling.
    if (!activePanel) {
      return (
        <EuiFlyoutBody data-test-subj={bodyTestSubj} scrollContainerRef={scrollContainerRef}>
          <div
            role="tabpanel"
            id={activeTab.panelDomId}
            aria-labelledby={activeTab.tabDomId}
            tabIndex={0}
          />
        </EuiFlyoutBody>
      );
    }

    return (
      <ActiveTabPanel
        key={activeTab.id}
        activeTab={activeTab}
        activePanel={activePanel}
        bodyTestSubj={bodyTestSubj}
        scrollContainerRef={scrollContainerRef}
      />
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
