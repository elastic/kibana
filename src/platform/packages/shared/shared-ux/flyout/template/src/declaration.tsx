/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { ParsedItem, ParsedPart } from '@kbn/ui-react-assembly';
import type {
  FlyoutBodyProps,
  FlyoutFooterProps,
  FlyoutHeaderProps,
  FlyoutTemplateProps,
  FlyoutTemplateTabRootProps,
} from './types';
import { flyoutAssembly, partsOf } from './assembly';
import { FlyoutHeaderCollapseProvider, FlyoutTabsProvider } from './context';
import { FlyoutTemplateFrameContext } from './context/frame_context';
import type { FlyoutTemplateFrameState } from './context/frame_context';
import type { FlyoutTabDescriptor, FlyoutTabsState } from './context/tabs_context';
import { useHeaderCollapse } from './use_header_collapse';
import { BodyZone, BODY_PART_NAME } from './body/body';
import { HeaderZone, HEADER_PART_NAME } from './header/header';
import { FooterZone, FOOTER_PART_NAME } from './footer/footer';

const ZONE_DISPLAY_NAMES: Record<string, string> = {
  [HEADER_PART_NAME]: 'Header',
  [BODY_PART_NAME]: 'Body',
  [FOOTER_PART_NAME]: 'Footer',
};

const TAB_ROOT_PROP_NAMES: ReadonlyArray<keyof FlyoutTemplateTabRootProps> = [
  'tabs',
  'tabBarProps',
  'defaultSelectedTabId',
  'selectedTabId',
  'onTabChange',
];

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

/** The zones one `FlyoutTemplate` element declares. */
export interface FlyoutTemplateZones {
  header?: FlyoutHeaderProps;
  body?: FlyoutBodyProps;
  footer?: FlyoutFooterProps;
}

/** Parses the declarative zone children of a `FlyoutTemplate` element. */
export const useFlyoutTemplateZones = (children: ReactNode): FlyoutTemplateZones => {
  const items = useMemo(() => flyoutAssembly.parseChildren(children), [children]);

  const headerItem = pickZone(items, HEADER_PART_NAME);
  const bodyItem = pickZone(items, BODY_PART_NAME);
  const footerItem = pickZone(items, FOOTER_PART_NAME);

  if (process.env.NODE_ENV !== 'production' && !bodyItem) {
    // eslint-disable-next-line no-console
    console.warn('[FlyoutTemplate] A <FlyoutTemplate.Body> is required.');
  }

  return {
    header: headerItem?.attributes as FlyoutHeaderProps | undefined,
    body: bodyItem?.attributes as FlyoutBodyProps | undefined,
    footer: footerItem?.attributes as FlyoutFooterProps | undefined,
  };
};

/** Picks the tab-bar props out of a set of root props, dropping the unset ones. */
export const pickTabRootProps = (
  props: Partial<FlyoutTemplateProps>
): FlyoutTemplateTabRootProps => {
  const picked: Record<string, unknown> = {};
  TAB_ROOT_PROP_NAMES.forEach((name) => {
    if (props[name] !== undefined) {
      picked[name] = props[name];
    }
  });
  return picked as FlyoutTemplateTabRootProps;
};

/** Removes the tab-bar props from a set of root props, leaving the ones the `EuiFlyout` takes. */
export const omitTabRootProps = <T extends Partial<FlyoutTemplateProps>>(
  props: T
): Omit<T, keyof FlyoutTemplateTabRootProps> => {
  const { tabs, tabBarProps, defaultSelectedTabId, selectedTabId, onTabChange, ...rest } = props;
  return rest;
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

type FlyoutTemplateZonesViewProps = FlyoutTemplateTabRootProps & {
  zones: FlyoutTemplateZones;
  flyoutTitleId: string;
};

/**
 * Renders a declaration's Header, Body, and Footer zones in template order, with its tab and
 * header-collapse state. It renders no flyout: the caller provides the `EuiFlyout` around it.
 */
export const FlyoutTemplateZonesView = ({
  zones,
  flyoutTitleId,
  tabs: tabsProp,
  tabBarProps,
  defaultSelectedTabId,
  selectedTabId: controlledSelectedTabId,
  onTabChange,
}: FlyoutTemplateZonesViewProps) => {
  const htmlIdSuffix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const tabIdPrefix = useGeneratedHtmlId({ prefix: `flyoutTemplateTab${htmlIdSuffix}` });

  if (process.env.NODE_ENV !== 'production' && tabsProp?.length && !zones.header) {
    // eslint-disable-next-line no-console
    console.warn(
      '[FlyoutTemplate] `tabs` is set but no <FlyoutTemplate.Header> is provided. The tab bar cannot render without a header zone.'
    );
  }

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
    () => ({ tabs, tabBarProps, selectedTabId, selectTab }),
    [tabs, tabBarProps, selectedTabId, selectTab]
  );

  const collapseState = useHeaderCollapse({ enabled: !zones.header?.collapsed });

  return (
    // A `FlyoutTemplate` inside zone content, such as a child flyout, is not a declaration of
    // this frame: it renders its own flyout.
    <FlyoutTemplateFrameContext.Provider value={null}>
      <FlyoutTabsProvider value={tabsContextValue}>
        <FlyoutHeaderCollapseProvider value={collapseState}>
          {zones.header && <HeaderZone {...zones.header} flyoutTitleId={flyoutTitleId} />}
          {zones.body && <BodyZone {...zones.body} />}
          {zones.footer && <FooterZone {...zones.footer} />}
        </FlyoutHeaderCollapseProvider>
      </FlyoutTabsProvider>
    </FlyoutTemplateFrameContext.Provider>
  );
};

/** Root props that a declaration inside a frame takes; the frame owns the rest. */
const isDeclarationPropName = (name: string) =>
  name === 'children' ||
  name === 'onClose' ||
  (TAB_ROOT_PROP_NAMES as readonly string[]).includes(name);

/** A `FlyoutTemplate` rendered inside a frame: it renders its zones into the frame's flyout. */
export const FlyoutTemplateDeclaration = ({
  frame,
  props,
}: {
  frame: FlyoutTemplateFrameState;
  props: Partial<FlyoutTemplateProps>;
}) => {
  const { children, onClose } = props;
  const { flyoutTitleId, isManaged, setHasHeader, declarationOnCloseRef, tabProps } = frame;
  const zones = useFlyoutTemplateZones(children);
  const hasHeader = Boolean(zones.header);

  const ignoredPropList = Object.keys(props)
    .filter(
      (name) =>
        !isDeclarationPropName(name) && props[name as keyof FlyoutTemplateProps] !== undefined
    )
    .join(', ');

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !ignoredPropList) return;
    // eslint-disable-next-line no-console
    console.warn(
      isManaged
        ? `[FlyoutTemplate] A managed flyout ignores root props on <FlyoutTemplate>; move ${ignoredPropList} to the options passed to the opener.`
        : `[FlyoutTemplate] Inside <FlyoutTemplate.Frame>, <FlyoutTemplate> ignores root props; move ${ignoredPropList} to the frame.`
    );
  }, [ignoredPropList, isManaged]);

  useLayoutEffect(() => {
    setHasHeader(hasHeader);
    return () => setHasHeader(false);
  }, [hasHeader, setHasHeader]);

  useLayoutEffect(() => {
    if (!isManaged) return;
    declarationOnCloseRef.current = onClose;
    return () => {
      if (declarationOnCloseRef.current === onClose) {
        declarationOnCloseRef.current = undefined;
      }
    };
  }, [declarationOnCloseRef, isManaged, onClose]);

  return (
    <FlyoutTemplateZonesView
      zones={zones}
      flyoutTitleId={flyoutTitleId}
      {...tabProps}
      {...pickTabRootProps(props)}
    />
  );
};
