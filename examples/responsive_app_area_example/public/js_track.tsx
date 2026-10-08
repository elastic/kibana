/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHideFor,
  EuiPanel,
  EuiShowFor,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useCurrentEuiBreakpoint,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { Demo, Step, SubSection } from './demo';
import { isBelow } from './mode';
import { useResponsiveSidebarApp } from './sidebar_app';
import type { Sees } from './what_eui_sees';

type Rendering = CoreStart['rendering'];

const HOW_IT_WORKS = `<EuiProvider breakpointContainer={{ mountElement }}>

container = mountElement.closest('[data-eui-breakpoint-container]') ?? body
// measured with one shared ResizeObserver, content box`;

const ACTIONS = [
  { label: 'Refresh', iconType: 'refresh' },
  { label: 'Share', iconType: 'share' },
  { label: 'Settings', iconType: 'gear' },
] as const;

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

const RootProbe = ({ label }: { label: string }) => {
  const breakpoint = useCurrentEuiBreakpoint();
  return (
    <EuiPanel paddingSize="s" hasShadow>
      <EuiText size="xs">
        {label}: <strong>{breakpoint}</strong>
      </EuiText>
    </EuiPanel>
  );
};

/** Mounts two separate React roots on `body`, outside the app area, one with a mount element hint and one without. */
const useOutsideRoots = (rendering: Rendering, isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;
    const host = document.createElement('div');
    Object.assign(host.style, {
      position: 'fixed',
      insetBlockEnd: '16px',
      insetInlineEnd: '16px',
      zIndex: '9000',
      display: 'flex',
      gap: '8px',
    });
    const withoutHint = document.createElement('div');
    const withHint = document.createElement('div');
    host.append(withoutHint, withHint);
    document.body.append(host);

    ReactDOM.render(rendering.addContext(<RootProbe label="No mountElement" />), withoutHint);
    ReactDOM.render(
      rendering.addContext(<RootProbe label="With mountElement" />, { mountElement: withHint }),
      withHint
    );

    return () => {
      ReactDOM.unmountComponentAtNode(withoutHint);
      ReactDOM.unmountComponentAtNode(withHint);
      host.remove();
    };
  }, [rendering, isOpen]);
};

export const JsTrack = ({ sees, rendering }: { sees: Sees; rendering: Rendering }) => {
  const sidebarApp = useResponsiveSidebarApp();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [areRootsOpen, setAreRootsOpen] = useState(false);
  const isCompact = useIsWithinBreakpoints(['xs', 's', 'm']);
  useOutsideRoots(rendering, areRootsOpen);

  const jsBelowM = isBelow(sees.js, 'm');

  return (
    <Step
      title="JS track"
      description="Hooks and components that switch in JS follow the same width: EuiShowFor and EuiHideFor, useIsWithinBreakpoints, and EUI internals like the page template and description list. Only active in CSS + JS mode."
    >
      <SubSection title="How it works">
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiCodeBlock language="tsx" fontSize="s" paddingSize="m">
              {HOW_IT_WORKS}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <ul>
                <li>
                  A hook can&apos;t see the DOM, so each React root says where it is mounted. EUI
                  measures the nearest container&apos;s content box, the same box CSS resolves
                  against.
                </li>
                <li>
                  App mounts pass nothing and default to the app area. Core&apos;s chrome root and{' '}
                  <EuiCode>toMountPoint</EuiCode> pass their own element, so the header, overlays
                  and toasts get <EuiCode>body</EuiCode>.
                </li>
                <li>
                  <EuiCode>EuiPortal</EuiCode> re-resolves from the portal node, so flyouts and
                  popovers opened from the app get <EuiCode>body</EuiCode> too.
                </li>
              </ul>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SubSection>

      <SubSection title="What it fixes">
        <EuiFlexGrid columns={3} gutterSize="l">
          <Demo
            title="Show and hide"
            kind="JS"
            now={jsBelowM ? 'icons' : 'labels'}
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
            now={jsBelowM ? 'list' : 'columns'}
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

          <Demo
            title="Your own hooks"
            kind="JS"
            now={isCompact ? 'icon' : 'label'}
            description={
              <>
                <EuiCode>useIsWithinBreakpoints</EuiCode> in app code. This button drops its label
                below l.
              </>
            }
          >
            {isCompact ? (
              <EuiToolTip content="Filters" disableScreenReaderOutput>
                <EuiButtonIcon display="base" iconType="filter" aria-label="Filters" />
              </EuiToolTip>
            ) : (
              <EuiButton size="s" iconType="filter">
                Filters (3 active)
              </EuiButton>
            )}
          </Demo>

          <Demo
            title="Flyouts and popovers keep the window"
            kind="JS"
            now={sees.window}
            description="Opened from the app, but rendered in a portal outside the app area. The flyout shows the breakpoint it sees."
          >
            <EuiButton size="s" onClick={() => setIsFlyoutOpen(true)}>
              Open flyout
            </EuiButton>
          </Demo>

          <Demo
            title="Header and sidebar keep the window"
            kind="JS"
            now={sees.window}
            description="Header buttons keep their labels when the sidebar opens. The sidebar shows the breakpoint it sees."
          >
            <EuiButton size="s" onClick={sidebarApp.open}>
              Open sidebar
            </EuiButton>
          </Demo>
        </EuiFlexGrid>
      </SubSection>

      <SubSection title="Issues">
        <EuiFlexGrid columns={3} gutterSize="l">
          <Demo
            title="Roots need a hint"
            now={areRootsOpen ? 'shown' : 'hidden'}
            description={
              <>
                Two React roots mounted on <EuiCode>body</EuiCode>, at the bottom right of the
                window. Both should see the window. In CSS + JS mode the one without a{' '}
                <EuiCode>mountElement</EuiCode> falls back to the app area. Any root created outside{' '}
                <EuiCode>toMountPoint</EuiCode> needs an audit or a lint rule.
              </>
            }
          >
            <EuiButton size="s" onClick={() => setAreRootsOpen((isOpen) => !isOpen)}>
              {areRootsOpen ? 'Remove roots' : 'Mount roots'}
            </EuiButton>
          </Demo>

          <Demo
            title="Sidebar toggles remount content"
            kind="JS"
            now={jsBelowM ? 'compact field' : 'full field'}
            description="EuiShowFor and EuiHideFor unmount their children when a breakpoint is crossed. Type something, then shrink the app area to s: the text is gone. Before, only a window resize did this."
          >
            <EuiHideFor sizes={['xs', 's']}>
              <EuiFieldText placeholder="Type here, then shrink to s" aria-label="Full field" />
            </EuiHideFor>
            <EuiShowFor sizes={['xs', 's']}>
              <EuiFieldText compressed placeholder="Compact field" aria-label="Compact field" />
            </EuiShowFor>
          </Demo>
        </EuiFlexGrid>
      </SubSection>

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
    </Step>
  );
};
