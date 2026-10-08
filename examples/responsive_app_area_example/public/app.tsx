/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHideFor,
  EuiHorizontalRule,
  EuiPageTemplate,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiMaxBreakpoint,
  useCurrentEuiBreakpoint,
  useEuiTheme,
  type EuiBreakpointSize,
} from '@elastic/eui';
import { useSidebar, useSidebarWidth } from '@kbn/core-chrome-sidebar-components';
import { useResponsiveSidebarApp } from './sidebar_app';

// Read once at module load: EUI applies the mode before the first render, so switching needs a reload.
const MODE_FLAG = 'kbnSurfacePoc';
const isAppAreaMode = localStorage.getItem(MODE_FLAG) === 'true';
const measuredName = isAppAreaMode ? 'app area' : 'window';

const MODE_OPTIONS = [
  { id: 'window', label: 'Window' },
  { id: 'appArea', label: 'App area' },
];

const setMode = (id: string) => {
  localStorage.setItem(MODE_FLAG, String(id === 'appArea'));
  window.location.reload();
};

const BREAKPOINTS: EuiBreakpointSize[] = ['xs', 's', 'm', 'l', 'xl'];

const ACTIONS = [
  { label: 'Refresh', iconType: 'refresh' },
  { label: 'Share', iconType: 'share' },
  { label: 'Settings', iconType: 'gear' },
] as const;

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
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const appArea = document.getElementById('app-main-scroll');
    if (!appArea) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.borderBoxSize[0].inlineSize))
    );
    observer.observe(appArea);
    return () => observer.disconnect();
  }, []);
  return width;
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

const Ruler = ({
  windowWidth,
  appAreaWidth,
  current,
}: {
  windowWidth: number;
  appAreaWidth: number;
  current?: EuiBreakpointSize;
}) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(windowWidth, euiTheme.breakpoint.xl) * 1.1;
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
      padding-inline: ${euiTheme.size.s};
      border-inline-end: ${euiTheme.border.thin};
      background: ${euiTheme.colors.backgroundBaseSubdued};
      white-space: nowrap;
    `,
    currentSegment: css`
      background: ${euiTheme.colors.backgroundLightPrimary};
      font-weight: ${euiTheme.font.weight.bold};
    `,
    marker: css`
      position: absolute;
      top: 0;
      bottom: 0;
      border-inline-start: 2px solid ${euiTheme.colors.textSubdued};
    `,
    measuredMarker: css`
      border-color: ${euiTheme.colors.primary};
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
    { name: 'window', width: windowWidth, labelCss: css({ top: 0 }) },
    { name: 'app area', width: appAreaWidth, labelCss: css({ bottom: 0 }) },
  ];

  return (
    <div css={styles.root}>
      <EuiText size="xs" css={styles.bar}>
        {BREAKPOINTS.map((size, i) => {
          const start = euiTheme.breakpoint[size];
          const end = euiTheme.breakpoint[BREAKPOINTS[i + 1]] ?? max;
          return (
            <div
              key={size}
              css={[styles.segment, size === current && styles.currentSegment]}
              style={{ width: percent(end - start) }}
            >
              {size} · {start}
            </div>
          );
        })}
      </EuiText>
      {markers.map(({ name, width, labelCss }) => {
        const isMeasured = name === measuredName;
        return (
          <div
            key={name}
            css={[styles.marker, isMeasured && styles.measuredMarker]}
            style={{ left: percent(width) }}
          >
            <EuiText
              size="xs"
              color={isMeasured ? 'default' : 'subdued'}
              css={[styles.label, labelCss]}
            >
              {isMeasured ? <strong>{name}</strong> : name} {width}px
            </EuiText>
          </div>
        );
      })}
    </div>
  );
};

const Step = ({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: ReactNode }>) => (
  <>
    <EuiTitle size="s">
      <h2>{title}</h2>
    </EuiTitle>
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    {children}
    <EuiSpacer size="xl" />
  </>
);

const Demo = ({
  title,
  kind,
  now,
  description,
  children,
}: PropsWithChildren<{ title: string; kind?: 'CSS' | 'JS'; now: string; description: string }>) => (
  <EuiFlexItem>
    <EuiPanel hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {kind && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={kind === 'CSS' ? 'accent' : 'primary'}>{kind}</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">now: {now}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  </EuiFlexItem>
);

const Box = ({ children }: PropsWithChildren) => (
  <EuiPanel color="subdued" paddingSize="m">
    <EuiText size="s" textAlign="center">
      {children}
    </EuiText>
  </EuiPanel>
);

const FlyoutContent = () => {
  const breakpoint = useCurrentEuiBreakpoint();
  return (
    <EuiText size="s">
      <p>
        EUI breakpoint inside this flyout: <EuiBadge color="primary">{breakpoint}</EuiBadge>
      </p>
      <p>
        The flyout renders in a portal outside the app area, so it is measured against the window
        even though it was opened from the app.
      </p>
    </EuiText>
  );
};

export const App = () => {
  const euiThemeContext = useEuiTheme();
  const { breakpoint: breakpoints } = euiThemeContext.euiTheme;
  const breakpoint = useCurrentEuiBreakpoint();
  const windowWidth = useWindowWidth();
  const appAreaWidth = useAppAreaWidth();
  const sidebar = useSidebar();
  const sidebarApp = useResponsiveSidebarApp();
  const shrinkAppArea = useShrinkAppArea(appAreaWidth);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const isBelow = (size: EuiBreakpointSize) =>
    breakpoint !== undefined && breakpoints[breakpoint] < breakpoints[size];
  const windowBreakpoint =
    [...BREAKPOINTS].reverse().find((size) => windowWidth >= breakpoints[size]) ?? 'xs';

  const ownGridStyles = css`
    display: grid;
    gap: ${euiThemeContext.euiTheme.size.s};
    grid-template-columns: repeat(3, 1fr);
    ${euiMaxBreakpoint(euiThemeContext, 'l')} {
      grid-template-columns: 1fr;
    }
  `;

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header
        pageTitle="Responsive app area"
        description="Pages respond to the space they get, not to the browser window."
        rightSideItems={[
          <EuiButtonGroup
            legend="EUI breakpoints follow"
            options={MODE_OPTIONS}
            idSelected={isAppAreaMode ? 'appArea' : 'window'}
            onChange={setMode}
          />,
        ]}
      />

      <EuiPageTemplate.Section>
        <Step
          title="1. What EUI measures"
          description={
            <>
              EUI breakpoint <EuiBadge color="primary">{breakpoint ?? '–'}</EuiBadge>, measured from
              the <strong>{measuredName}</strong>. Narrow the app area with the sidebar and watch
              which marker moves the highlighted breakpoint.
            </>
          }
        >
          <EuiPanel hasBorder>
            <Ruler windowWidth={windowWidth} appAreaWidth={appAreaWidth} current={breakpoint} />
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">Try:</EuiText>
              </EuiFlexItem>
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
          </EuiPanel>
        </Step>

        <Step
          title="2. Content inside the app area"
          description={`Everything the app renders in place follows the ${measuredName}, in CSS and in JS.`}
        >
          <EuiFlexGrid columns={2} gutterSize="l">
            <Demo
              title="Flex group"
              kind="CSS"
              now={isBelow('m') ? 'stacked' : 'row'}
              description="EuiFlexGroup stacks its items below m."
            >
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <Box>One</Box>
                </EuiFlexItem>
                <EuiFlexItem>
                  <Box>Two</Box>
                </EuiFlexItem>
                <EuiFlexItem>
                  <Box>Three</Box>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Demo>

            <Demo
              title="Your own styles"
              kind="CSS"
              now={isBelow('l') ? '1 column' : '3 columns'}
              description="Styles written with euiMaxBreakpoint follow the same width. This grid collapses below l."
            >
              <div css={ownGridStyles}>
                <Box>One</Box>
                <Box>Two</Box>
                <Box>Three</Box>
              </div>
            </Demo>

            <Demo
              title="Show and hide"
              kind="JS"
              now={isBelow('m') ? 'icons' : 'labels'}
              description="EuiShowFor and EuiHideFor render by breakpoint. These actions drop their labels below m."
            >
              <EuiFlexGroup gutterSize="s" responsive={false}>
                {ACTIONS.map(({ label, iconType }) => (
                  <EuiFlexItem grow={false} key={label}>
                    <EuiHideFor sizes={['xs', 's']}>
                      <EuiButton size="s" iconType={iconType}>
                        {label}
                      </EuiButton>
                    </EuiHideFor>
                    <EuiShowFor sizes={['xs', 's']}>
                      <EuiToolTip content={label} disableScreenReaderOutput>
                        <EuiButtonIcon display="base" iconType={iconType} aria-label={label} />
                      </EuiToolTip>
                    </EuiShowFor>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </Demo>

            <Demo
              title="EUI internals"
              kind="JS"
              now={isBelow('m') ? 'list' : 'columns'}
              description="Components that switch layout in JS follow too. This description list becomes a single list below m."
            >
              <EuiDescriptionList
                type="responsiveColumn"
                compressed
                listItems={[
                  { title: 'Status', description: 'Healthy' },
                  { title: 'Owner', description: 'Platform team' },
                  { title: 'Updated', description: '2 minutes ago' },
                ]}
              />
            </Demo>
          </EuiFlexGrid>
        </Step>

        <Step
          title="3. Content outside the app area"
          description="Portals and chrome mount outside the app area, so they always follow the window."
        >
          <EuiFlexGrid columns={2} gutterSize="l">
            <Demo
              title="Flyouts and popovers"
              now={windowBreakpoint}
              description="Opened from the app, but rendered in a portal. The flyout shows the breakpoint it sees."
            >
              <EuiButton size="s" onClick={() => setIsFlyoutOpen(true)}>
                Open flyout
              </EuiButton>
            </Demo>

            <Demo
              title="Header, navigation and sidebar"
              now={windowBreakpoint}
              description="Header buttons keep their labels when the sidebar opens. The sidebar shows the breakpoint it sees."
            >
              <EuiButton size="s" onClick={sidebarApp.open}>
                Open sidebar
              </EuiButton>
            </Demo>
          </EuiFlexGrid>
        </Step>

        <EuiAccordion id="howItWorks" buttonContent="How it works" paddingSize="m">
          <EuiText size="s">
            <ul>
              <li>
                <strong>CSS.</strong> EUI breakpoint mixins emit{' '}
                <EuiCode>@container euiSurface (…)</EuiCode> instead of <EuiCode>@media</EuiCode>.
                The app area and <EuiCode>body</EuiCode> are both <EuiCode>euiSurface</EuiCode>{' '}
                containers, so styles resolve against the nearest one.
              </li>
              <li>
                <strong>JS.</strong> Each React root tells EUI where it is mounted. Kibana maps
                mounts inside <EuiCode>#app-main-scroll</EuiCode> to the app area, and everything
                else to the window. Portals re-resolve from the portal node.
              </li>
              <li>
                <strong>Toggle.</strong> The Window and App area buttons set{' '}
                <EuiCode>localStorage.kbnSurfacePoc</EuiCode> and reload, because EUI reads the mode
                before the first render.
              </li>
            </ul>
          </EuiText>
        </EuiAccordion>
      </EuiPageTemplate.Section>

      {isFlyoutOpen && (
        <EuiFlyout
          size="s"
          ownFocus
          onClose={() => setIsFlyoutOpen(false)}
          aria-labelledby="flyoutTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="flyoutTitle">Flyout</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <FlyoutContent />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </EuiPageTemplate>
  );
};
