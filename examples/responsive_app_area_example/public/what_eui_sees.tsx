/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EUI_BREAKPOINT_CONTAINER_ATTRIBUTE,
  useCurrentEuiBreakpoint,
  useEuiTheme,
  type EuiBreakpointSize,
} from '@elastic/eui';
import { useSidebar, useSidebarWidth } from '@kbn/core-chrome-sidebar-components';
import { useResponsiveSidebarApp } from './sidebar_app';
import { BREAKPOINTS, cssFollowsAppArea } from './mode';

export interface Sees {
  windowWidth: number;
  appAreaWidth: number;
  window: EuiBreakpointSize;
  css: EuiBreakpointSize;
  js?: EuiBreakpointSize;
}

const getAppArea = () =>
  document.querySelector<HTMLElement>(`[${EUI_BREAKPOINT_CONTAINER_ATTRIBUTE}]`);

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
};

const useAppAreaWidth = () => {
  const [width, setWidth] = useState(() => getAppArea()?.clientWidth ?? 0);
  useEffect(() => {
    const appArea = getAppArea();
    if (!appArea) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentBoxSize[0].inlineSize))
    );
    observer.observe(appArea);
    return () => observer.disconnect();
  }, []);
  return width;
};

/** CSS breakpoints are derived from the width the mode resolves against; JS ones come from EUI itself. */
export const useWhatEuiSees = (): Sees => {
  const { euiTheme } = useEuiTheme();
  const windowWidth = useWindowWidth();
  const appAreaWidth = useAppAreaWidth();
  const js = useCurrentEuiBreakpoint();

  const toBreakpoint = (width: number) =>
    [...BREAKPOINTS].reverse().find((size) => width >= euiTheme.breakpoint[size]) ?? 'xs';

  return {
    windowWidth,
    appAreaWidth,
    window: toBreakpoint(windowWidth),
    css: toBreakpoint(cssFollowsAppArea ? appAreaWidth : windowWidth),
    js,
  };
};

/** Opens the sidebar wide enough to leave the app area in the middle of the given breakpoint. */
const useShrinkAppArea = (appAreaWidth: number) => {
  const { euiTheme } = useEuiTheme();
  const sidebar = useSidebar();
  const sidebarWidth = useSidebarWidth();
  const sidebarApp = useResponsiveSidebarApp();

  return (size: EuiBreakpointSize) => {
    const next = BREAKPOINTS[BREAKPOINTS.indexOf(size) + 1];
    const target = (euiTheme.breakpoint[size] + euiTheme.breakpoint[next]) / 2;
    // The sidebar width is clamped to half the window, so narrow windows can't reach every target.
    sidebar.setWidth((sidebar.isOpen ? sidebarWidth : 0) + appAreaWidth - target);
    sidebarApp.open();
  };
};

const Ruler = ({ sees }: { sees: Sees }) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(sees.windowWidth, euiTheme.breakpoint.xl) * 1.1;
  const percent = (px: number) => `${(px / max) * 100}%`;

  const styles = {
    root: css`
      position: relative;
      padding: ${euiTheme.size.l} 0;
    `,
    bar: css`
      display: flex;
      height: ${euiTheme.size.xl};
      border-radius: ${euiTheme.border.radius.medium};
      overflow: hidden;
    `,
    segment: css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      padding-inline: ${euiTheme.size.s};
      border-inline-end: ${euiTheme.border.thin};
      background: ${euiTheme.colors.backgroundBaseSubdued};
      white-space: nowrap;
      overflow: hidden;
    `,
    marker: css`
      position: absolute;
      top: 0;
      bottom: 0;
      border-inline-start: 2px solid ${euiTheme.colors.textSubdued};
    `,
    label: css`
      position: absolute;
      transform: translateX(-100%);
      padding-inline-end: ${euiTheme.size.xs};
      white-space: nowrap;
    `,
  };

  // Labels sit left of their marker, the window above the bar and the app area below, so they never overlap.
  const markers = [
    { name: 'window', width: sees.windowWidth, labelCss: css({ top: 0 }) },
    { name: 'app area', width: sees.appAreaWidth, labelCss: css({ bottom: 0 }) },
  ];

  return (
    <div css={styles.root}>
      <EuiText size="xs" css={styles.bar}>
        {BREAKPOINTS.map((size, i) => {
          const start = euiTheme.breakpoint[size];
          const end = euiTheme.breakpoint[BREAKPOINTS[i + 1]] ?? max;
          return (
            <div key={size} css={styles.segment} style={{ width: percent(end - start) }}>
              {size} · {start}
              {size === sees.css && <EuiBadge color="accent">CSS</EuiBadge>}
              {size === sees.js && <EuiBadge color="primary">JS</EuiBadge>}
            </div>
          );
        })}
      </EuiText>
      {markers.map(({ name, width, labelCss }) => (
        <div key={name} css={styles.marker} style={{ left: percent(width) }}>
          <EuiText size="xs" css={[styles.label, labelCss]}>
            <strong>{name}</strong> {width}px
          </EuiText>
        </div>
      ))}
    </div>
  );
};

export const WhatEuiSees = ({ sees }: { sees: Sees }) => {
  const { euiTheme } = useEuiTheme();
  const sidebar = useSidebar();
  const shrinkAppArea = useShrinkAppArea(sees.appAreaWidth);
  const agree = sees.css === sees.js;

  return (
    <EuiPanel
      hasBorder
      css={css`
        position: sticky;
        top: ${euiTheme.size.s};
        z-index: 1;
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="accent">CSS sees {sees.css}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="primary">JS sees {sees.js ?? '–'}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={agree ? 'success' : 'warning'}>{agree ? 'agree' : 'disagree'}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => shrinkAppArea('s')}>
            Shrink app area to s
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => shrinkAppArea('m')}>
            Shrink app area to m
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={sidebar.close} isDisabled={!sidebar.isOpen}>
            Close sidebar
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Ruler sees={sees} />
    </EuiPanel>
  );
};
