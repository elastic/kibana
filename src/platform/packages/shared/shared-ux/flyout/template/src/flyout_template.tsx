/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { EuiFlyout, useGeneratedHtmlId } from '@elastic/eui';
import type { ParsedItem, ParsedPart } from '@kbn/ui-react-assembly';
import type {
  FlyoutBodyProps,
  FlyoutFooterProps,
  FlyoutHeaderProps,
  FlyoutTemplateProps,
} from './types';
import { bodyAssembly, flyoutAssembly, headerAssembly, partsOf } from './assembly';
import {
  FlyoutHeaderCollapseProvider,
  FlyoutTabsProvider,
  FlyoutTemplateConfigProvider,
} from './context';
import type { FlyoutTabsState } from './context';
import { useHeaderCollapse } from './use_header_collapse';
import { Body, BodyZone, BODY_PART_NAME } from './body/body';
import { Header, HeaderZone, HEADER_PART_NAME } from './header/header';
import { Footer, FooterZone, FOOTER_PART_NAME } from './footer/footer';
import { tabPart, TAB_PART_NAME } from './header/tab';
import { TAB_PANEL_PART_NAME } from './body/tab_panel';
import type { HeaderTabDescriptor } from './header/tab/types';

const ZONE_DISPLAY_NAMES: Record<string, string> = {
  [HEADER_PART_NAME]: 'Header',
  [BODY_PART_NAME]: 'Body',
  [FOOTER_PART_NAME]: 'Footer',
};

/** Selects a singleton zone; duplicate zones warn in dev and the first wins. */
const pickZone = (items: ParsedItem[], partName: string): ParsedPart | undefined => {
  const matches = partsOf(items, partName);
  if (process.env.NODE_ENV !== 'production' && matches.length > 1) {
    const displayName = ZONE_DISPLAY_NAMES[partName] ?? partName;
    // eslint-disable-next-line no-console
    console.warn(
      `[FlyoutTemplate] Multiple <FlyoutTemplate.${displayName}> zones provided; rendering only the first.`
    );
  }
  return matches[0];
};

const resolveDefaultSelectedTabId = (
  tabs: HeaderTabDescriptor[],
  defaultId: string | undefined
) => {
  if (defaultId !== undefined && tabs.some((tab) => tab.id === defaultId)) {
    return defaultId;
  }
  return tabs[0]?.id;
};

/** Root component that renders Header, Body, Footer zones in template order. */
const FlyoutTemplateRoot = ({
  children,
  onClose,
  size = 'm',
  minWidth,
  type,
  maxWidth,
  paddingSize,
  ownFocus,
  resizable,
  onResize,
  session = 'start',
  historyKey,
  onActive,
  flyoutMenuProps,
  id,
  hasChildBackground,
  outsideClickCloses,
  focusTrapProps,
  closeButtonProps,
  defaultSelectedTabId,
  selectedTabId: controlledSelectedTabId,
  onTabChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'data-test-subj': dataTestSubj,
}: FlyoutTemplateProps) => {
  const htmlIdSuffix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const flyoutTitleId = useGeneratedHtmlId({ prefix: `flyoutTemplateTitle${htmlIdSuffix}` });
  const tabIdPrefix = useGeneratedHtmlId({ prefix: `flyoutTemplateTab${htmlIdSuffix}` });
  const items = useMemo(() => flyoutAssembly.parseChildren(children), [children]);

  const headerItem = pickZone(items, HEADER_PART_NAME);
  const bodyItem = pickZone(items, BODY_PART_NAME);
  const footerItem = pickZone(items, FOOTER_PART_NAME);

  if (process.env.NODE_ENV !== 'production' && !bodyItem) {
    // eslint-disable-next-line no-console
    console.warn('[FlyoutTemplate] A <FlyoutTemplate.Body> is required.');
  }

  const headerAttrs = headerItem?.attributes as FlyoutHeaderProps | undefined;
  const bodyAttrs = bodyItem?.attributes as FlyoutBodyProps | undefined;
  const menuTitle = headerAttrs?.title;
  const menuTitleString = typeof menuTitle === 'string' ? menuTitle : undefined;
  const flyoutAriaLabelledBy =
    ariaLabelledBy ?? (!ariaLabel && headerItem ? flyoutTitleId : undefined);
  const flyoutAriaLabel = flyoutAriaLabelledBy ? undefined : ariaLabel ?? menuTitleString;

  // Feed string titles to EUI's flyout menu for history/navigation.
  const mergedMenuProps = {
    ...(menuTitleString !== undefined ? { title: menuTitleString } : {}),
    ...flyoutMenuProps,
  };
  const hasMenuProps = Object.keys(mergedMenuProps).length > 0;

  // Parsed here rather than in `HeaderZone` so tab state lives at this level;
  // `HeaderZone` renders the same items, so the children are only walked once.
  const headerItems = useMemo(
    () => (headerAttrs?.children ? headerAssembly.parseChildren(headerAttrs.children) : []),
    [headerAttrs?.children]
  );

  // The header is the sole source of truth for which tabs exist: a tab whose panel is absent is
  // still rendered, because consumers may supply only the selected panel and mount it on demand.
  const tabs = useMemo<HeaderTabDescriptor[]>(() => {
    const tabParts = partsOf(headerItems, TAB_PART_NAME);
    const descriptors: HeaderTabDescriptor[] = [];
    for (const [index, part] of tabParts.entries()) {
      const descriptor = tabPart.resolve(part, undefined);
      if (!descriptor) continue;
      descriptors.push({
        ...descriptor,
        tabDomId: `${tabIdPrefix}-${index}`,
        panelDomId: `${tabIdPrefix}-${index}-panel`,
      });
    }
    return descriptors;
  }, [headerItems, tabIdPrefix]);

  const bodyItems = useMemo(
    () =>
      bodyAttrs?.children
        ? bodyAssembly.parseChildren(bodyAttrs.children, { supportsOtherChildren: true })
        : [],
    [bodyAttrs?.children]
  );

  const panelTabIds = useMemo(
    () => new Set(partsOf(bodyItems, TAB_PANEL_PART_NAME).map((p) => p.attributes.tabId as string)),
    [bodyItems]
  );
  const hasTabPanels = panelTabIds.size > 0;

  // A panel with no matching tab can never be reached; warn. A tab with no panel may be on-demand.
  const orphanPanelKey = useMemo(() => {
    const declaredTabIds = new Set(tabs.map((tab) => tab.id));
    return [...panelTabIds].filter((panelId) => !declaredTabIds.has(panelId)).join(', ');
  }, [tabs, panelTabIds]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (orphanPanelKey) {
      // eslint-disable-next-line no-console
      console.warn(
        `[FlyoutTemplate] <FlyoutTemplate.Body.TabPanel> with no matching <FlyoutTemplate.Header.Tab>: ${orphanPanelKey}. These panels are not rendered.`
      );
    }
  }, [orphanPanelKey]);

  const isControlled = controlledSelectedTabId !== undefined;

  const [uncontrolledTabId, setUncontrolledTabId] = useState<string | undefined>(() =>
    resolveDefaultSelectedTabId(tabs, defaultSelectedTabId)
  );

  useEffect(() => {
    if (isControlled) return;
    const hasSelectedTab = tabs.some((tab) => tab.id === uncontrolledTabId);
    const nextTabId = hasSelectedTab
      ? uncontrolledTabId
      : resolveDefaultSelectedTabId(tabs, defaultSelectedTabId);
    if (nextTabId !== uncontrolledTabId) {
      setUncontrolledTabId(nextTabId);
    }
  }, [defaultSelectedTabId, isControlled, tabs, uncontrolledTabId]);

  const requestedSelectedTabId = isControlled ? controlledSelectedTabId : uncontrolledTabId;
  const selectedTabId = tabs.some((tab) => tab.id === requestedSelectedTabId)
    ? requestedSelectedTabId
    : resolveDefaultSelectedTabId(tabs, defaultSelectedTabId);

  const selectTab = useCallback(
    (tabId: string) => {
      if (!isControlled) {
        setUncontrolledTabId(tabId);
      }
      onTabChange?.(tabId);
    },
    [isControlled, onTabChange]
  );

  const tabsContextValue = useMemo<FlyoutTabsState>(
    () => ({ tabs, selectedTabId, selectTab, hasTabPanels }),
    [tabs, selectedTabId, selectTab, hasTabPanels]
  );

  const collapseState = useHeaderCollapse({ enabled: !headerAttrs?.collapsed });

  return (
    <EuiFlyout
      onClose={onClose}
      size={size}
      minWidth={minWidth}
      type={type}
      maxWidth={maxWidth}
      paddingSize={paddingSize}
      ownFocus={ownFocus}
      resizable={resizable}
      onResize={onResize}
      session={session}
      historyKey={historyKey}
      onActive={onActive}
      flyoutMenuDisplayMode="auto"
      flyoutMenuProps={hasMenuProps ? mergedMenuProps : undefined}
      id={id}
      hasChildBackground={hasChildBackground}
      outsideClickCloses={outsideClickCloses}
      focusTrapProps={focusTrapProps}
      closeButtonProps={closeButtonProps}
      aria-label={flyoutAriaLabel}
      aria-labelledby={flyoutAriaLabelledBy}
      data-test-subj={dataTestSubj}
    >
      <FlyoutTemplateConfigProvider value={{ dataTestSubj, paddingSize }}>
        <FlyoutTabsProvider value={tabsContextValue}>
          <FlyoutHeaderCollapseProvider value={collapseState}>
            {headerItem && (
              <HeaderZone
                {...(headerAttrs as FlyoutHeaderProps)}
                items={headerItems}
                flyoutTitleId={flyoutTitleId}
              />
            )}
            {bodyItem && <BodyZone {...(bodyAttrs as FlyoutBodyProps)} items={bodyItems} />}
            {footerItem && <FooterZone {...(footerItem.attributes as FlyoutFooterProps)} />}
          </FlyoutHeaderCollapseProvider>
        </FlyoutTabsProvider>
      </FlyoutTemplateConfigProvider>
    </EuiFlyout>
  );
};

/** `FlyoutTemplate` with its declarative zones attached as compound namespaces. */
export const FlyoutTemplate = Object.assign(FlyoutTemplateRoot, {
  Header,
  Body,
  Footer,
});
