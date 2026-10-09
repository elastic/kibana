/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
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

const HOW_IT_WORKS = `// the app mount opts in
rendering.addContext(<App />, { mountElement: element })

<EuiProvider breakpointContainer={{ mountElement }}>

container = mountElement.closest('[data-eui-breakpoint-container]') ?? body
// measured with one shared ResizeObserver, content box
// roots without a mountElement keep the window`;

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

/** Mounts two React roots inside `host`, in the app area, one with a mount element and one without. */
const useNestedRoots = (
  rendering: Rendering,
  host: React.RefObject<HTMLDivElement>,
  isOpen: boolean
) => {
  useEffect(() => {
    const { current } = host;
    if (!isOpen || !current) return;
    const withoutHint = document.createElement('div');
    const withHint = document.createElement('div');
    current.append(withoutHint, withHint);

    ReactDOM.render(rendering.addContext(<RootProbe label="No mountElement" />), withoutHint);
    ReactDOM.render(
      rendering.addContext(<RootProbe label="With mountElement" />, { mountElement: withHint }),
      withHint
    );

    return () => {
      ReactDOM.unmountComponentAtNode(withoutHint);
      ReactDOM.unmountComponentAtNode(withHint);
      withoutHint.remove();
      withHint.remove();
    };
  }, [rendering, host, isOpen]);
};

export const JsTrack = ({ sees, rendering }: { sees: Sees; rendering: Rendering }) => {
  const sidebarApp = useResponsiveSidebarApp();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [areRootsOpen, setAreRootsOpen] = useState(false);
  const rootsHost = useRef<HTMLDivElement>(null);
  const isCompact = useIsWithinBreakpoints(['xs', 's', 'm']);
  useNestedRoots(rendering, rootsHost, areRootsOpen);

  const jsBelowM = isBelow(sees.js, 'm');

  return (
    <Step
      title="JS track"
      description="Hooks and components that switch in JS follow the same width: EuiShowFor and EuiHideFor, useIsWithinBreakpoints, and EUI internals like the page template and description list. Only active in CSS + JS mode, for React roots that opt in."
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
                  A hook can&apos;t see the DOM, so a React root opts in by passing the element it
                  is mounted in. EUI measures the nearest container&apos;s content box, the same box
                  CSS resolves against.
                </li>
                <li>
                  Roots that pass nothing keep the window. This app&apos;s mount opts in. The
                  header, overlays, toasts and every other root don&apos;t.
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
            title="Nested roots must opt in too"
            kind="JS"
            now={areRootsOpen ? 'shown' : 'hidden'}
            description={
              <>
                Two React roots mounted here, inside the app area. In CSS + JS mode only the one
                with a <EuiCode>mountElement</EuiCode> follows the app; the other keeps the window.
                Opt-in is per root, so <EuiCode>toMountPoint</EuiCode> and custom roots inside an
                app need it too.
              </>
            }
          >
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
              <EuiButton size="s" onClick={() => setAreRootsOpen((isOpen) => !isOpen)}>
                {areRootsOpen ? 'Remove roots' : 'Mount roots'}
              </EuiButton>
              <EuiFlexGroup gutterSize="s" responsive={false} ref={rootsHost} />
            </EuiFlexGroup>
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

      <SubSection title="Other options (not decided)">
        <EuiText size="s">
          <p>
            This PoC shows roots opting in. How JS should find its container is still open. Each
            option has its own caveat:
          </p>
          <ul>
            <li>
              <strong>Roots opt in (shown here).</strong> Without a <EuiCode>mountElement</EuiCode>{' '}
              JS keeps the window, so nothing gets a wrong answer silently. Opt-in is per root, not
              per app: nested roots in an opted-in app disagree with it until they opt in too.
            </li>
            <li>
              <strong>Roots default to the app area.</strong> Core&apos;s chrome root and{' '}
              <EuiCode>toMountPoint</EuiCode> pass their own element, so apps are covered without
              changes. A root created any other way, outside the app area, silently follows the app
              area instead of the window.
            </li>
            <li>
              <strong>Element-scoped hooks.</strong> A hook takes a ref and measures from that
              element, and EUI components measure themselves. No root plumbing, but every call needs
              a ref, <EuiCode>EuiShowFor</EuiCode> and <EuiCode>EuiHideFor</EuiCode> have no
              element, and the first render uses a fallback before the measurement lands.
            </li>
            <li>
              <strong>Keep JS on the window.</strong> EUI moves its cheap JS switches to CSS. No new
              API, but JS-driven layouts still ignore the sidebar.
            </li>
          </ul>
        </EuiText>
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
