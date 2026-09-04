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
import { flyoutAssembly, partsOf } from './assembly';
import {
  FlyoutHeaderCollapseProvider,
  FlyoutTabsProvider,
  FlyoutTemplateConfigProvider,
} from './context';
import type { FlyoutTabDescriptor, FlyoutTabsState } from './context/tabs_context';
import { useHeaderCollapse } from './use_header_collapse';
import { Body, BodyZone, BODY_PART_NAME } from './body/body';
import { Header, HeaderZone, HEADER_PART_NAME } from './header/header';
import { Footer, FooterZone, FOOTER_PART_NAME } from './footer/footer';

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
  tabs: FlyoutTabDescriptor[],
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
  tabs: tabsProp,
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

  if (process.env.NODE_ENV !== 'production' && tabsProp?.length && !headerItem) {
    // eslint-disable-next-line no-console
    console.warn(
      '[FlyoutTemplate] `tabs` is set but no <FlyoutTemplate.Header> is provided. The tab bar cannot render without a header zone.'
    );
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

  const tabs = useMemo<FlyoutTabDescriptor[]>(() => {
    const seen = new Set<string>();
    return (tabsProp ?? [])
      .filter((tab) => {
        if (seen.has(tab.id)) return false;
        seen.add(tab.id);
        return true;
      })
      .map((tab, index) => ({
        ...tab,
        tabDomId: `${tabIdPrefix}-${index}`,
        panelDomId: `${tabIdPrefix}-${index}-panel`,
      }));
  }, [tabsProp, tabIdPrefix]);

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

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (
      isControlled &&
      tabs.length > 0 &&
      !tabs.some((tab) => tab.id === controlledSelectedTabId)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[FlyoutTemplate] selectedTabId "${controlledSelectedTabId}" does not match any tab. Falling back to the first tab.`
      );
    }
  }, [isControlled, controlledSelectedTabId, tabs]);

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
    () => ({ tabs, selectedTabId, selectTab }),
    [tabs, selectedTabId, selectTab]
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
              <HeaderZone {...(headerAttrs as FlyoutHeaderProps)} flyoutTitleId={flyoutTitleId} />
            )}
            {bodyItem && <BodyZone {...(bodyAttrs as FlyoutBodyProps)} />}
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
