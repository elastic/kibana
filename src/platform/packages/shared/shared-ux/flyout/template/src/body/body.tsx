/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
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
import { Callout, renderCalloutBanner } from './callout';
import { Section, SECTION_PART_NAME, sectionPart } from './section';
import { Subsection } from './subsection';
import { TAB_PANEL_PART_NAME, TabPanel } from './tab_panel';

/**
 * Renders `Section`, `Accordion`, and unstructured children from pre-parsed items in source order.
 * `Callout` parts are skipped: they render in the banner, never inline.
 */
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

/**
 * Keyed by the tab id, so the error boundary and the panel's content reset per tab while the
 * surrounding `EuiFlyoutBody` and its banner stay mounted. A panel that is not yet supplied (e.g.
 * on-demand mounting) keeps the tabpanel wrapper, so the selected tab's `aria-controls` points at a
 * real element.
 */
const ActiveTabPanel = ({
  activeTab,
  activePanel,
}: {
  activeTab: FlyoutTabDescriptor;
  activePanel: ParsedPart | undefined;
}) => {
  const panelChildren = activePanel?.attributes.children as ReactNode;
  const content = useMemo(
    () =>
      activePanel
        ? renderBodyItems(
            bodyAssembly.parseChildren(panelChildren, { supportsOtherChildren: true })
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePanel]
  );
  return (
    <div
      role="tabpanel"
      id={activeTab.panelDomId}
      aria-labelledby={activeTab.tabDomId}
      tabIndex={0}
      data-test-subj={activePanel?.attributes['data-test-subj'] as string | undefined}
    >
      {content && <KibanaErrorBoundary>{content}</KibanaErrorBoundary>}
    </div>
  );
};

/** Part name used for identifying the `Body` zone. */
export const BODY_PART_NAME = 'body';

const bodyPart = flyoutAssembly.definePart({ name: BODY_PART_NAME });

/** Declarative `FlyoutTemplate.Body`; the root renders the collected attributes. */
const BaseBody = bodyPart.createComponent<FlyoutBodyProps>();
BaseBody.displayName = 'FlyoutTemplate.Body';

export const Body = Object.assign(BaseBody, {
  Callout,
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
  const scrollNodeRef = useRef<HTMLElement | null>(null);
  const bodyScrollContainerRef = useCallback(
    (node: HTMLElement | null) => {
      scrollNodeRef.current = node;
      scrollContainerRef(node);
    },
    [scrollContainerRef]
  );

  // Keyed on `items`, which holds its identity across a tab switch, so `EuiFlyoutBody` receives
  // the same banner element and React skips the subtree.
  const banner = useMemo(() => renderCalloutBanner(items), [items]);

  const isTabbedMode = tabs.length > 0;
  const activeTab = isTabbedMode ? tabs.find((tab) => tab.id === selectedTabId) : undefined;

  // The body stays mounted across tab switches, so its scroll position has to be reset by hand.
  // The resulting `scroll` event re-runs the header-collapse evaluation.
  useLayoutEffect(() => {
    if (scrollNodeRef.current) scrollNodeRef.current.scrollTop = 0;
  }, [activeTab?.id]);

  const bodyTestSubj = resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Body');

  const renderTabbedContent = () => {
    if (!activeTab) return null;
    const activePanel = partsOf(items, TAB_PANEL_PART_NAME).find(
      (panel) => (panel.attributes.tabId as string) === activeTab.id
    );
    return <ActiveTabPanel key={activeTab.id} activeTab={activeTab} activePanel={activePanel} />;
  };

  return (
    <KibanaErrorBoundaryProvider>
      <EuiFlyoutBody
        data-test-subj={bodyTestSubj}
        banner={banner}
        scrollContainerRef={bodyScrollContainerRef}
      >
        {isTabbedMode ? (
          renderTabbedContent()
        ) : (
          <KibanaErrorBoundary>{renderBodyItems(items)}</KibanaErrorBoundary>
        )}
      </EuiFlyoutBody>
    </KibanaErrorBoundaryProvider>
  );
};
