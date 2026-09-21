/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayRef, OverlayStart } from '@kbn/core/public';
import { FlyoutTemplate } from '@kbn/flyout-template';

import { FLYOUT_MIN_WIDTH } from '../utils';

const APP_MAIN_SCROLL_ID = 'app-main-scroll';

const readInlinePadding = () => ({
  container: document.getElementById(APP_MAIN_SCROLL_ID)?.style.paddingInlineEnd ?? 'n/a',
  body: document.body.style.paddingInlineEnd,
});

/**
 * Live view of the inline `padding-inline-end` EUI writes for push flyouts. Kibana scopes flyouts
 * to `#app-main-scroll`, so that element is the padding target; `document.body` is shown too in
 * case a flyout falls back to the viewport.
 */
const PushPaddingReadout: React.FC<{ openCount: number }> = ({ openCount }) => {
  const [padding, setPadding] = useState(readInlinePadding);

  useEffect(() => {
    const update = () => setPadding(readInlinePadding());
    const observer = new MutationObserver(update);
    const targets = [document.getElementById(APP_MAIN_SCROLL_ID), document.body].filter(
      (el): el is HTMLElement => el != null
    );
    targets.forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ['style'] }));
    update();
    return () => observer.disconnect();
  }, []);

  const hasPadding = padding.container !== '' || padding.body !== '';
  const stranded = openCount === 0 && hasPadding;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiCode>#{APP_MAIN_SCROLL_ID}</EuiCode> padding-inline-end:{' '}
          <strong data-test-subj="pushPaddingContainerValue">
            {padding.container || '(none)'}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiCode>body</EuiCode> padding-inline-end:{' '}
          <strong data-test-subj="pushPaddingBodyValue">{padding.body || '(none)'}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          Flyouts open from this section: <strong>{openCount}</strong>
        </EuiText>
      </EuiFlexItem>
      {stranded && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger" data-test-subj="pushPaddingStrandedBadge">
            Stranded padding: nothing open, page still pushed
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

interface SlotProps {
  label: string;
  onOpenChange: (isOpen: boolean) => void;
}

/** A plain `EuiFlyout` with `session="never"`: no manager session, rendered in this app's root. */
const StandalonePushSlot: React.FC<SlotProps> = ({ label, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isOpen);
    onOpenChange(!isOpen);
  };
  return (
    <>
      <EuiButton
        size="s"
        color={isOpen ? 'danger' : 'primary'}
        onClick={toggle}
        data-test-subj={`pushPaddingToggle-${label}`}
      >
        {isOpen ? `Close ${label}` : `Open ${label}`}
      </EuiButton>
      {isOpen && (
        <EuiFlyout
          session="never"
          type="push"
          size="s"
          resizable
          minWidth={FLYOUT_MIN_WIDTH}
          onClose={toggle}
          aria-labelledby={`pushPaddingFlyout-${label}`}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={`pushPaddingFlyout-${label}`}>{label}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                Standalone <EuiCode>type=&quot;push&quot;</EuiCode> flyout (
                <EuiCode>session=&quot;never&quot;</EuiCode>). Close it from the page button so the
                close order is under your control.
              </p>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

/** A system flyout (own React root, new manager session) opened via `core.overlays.openFlyoutTemplate`. */
const SystemSlot: React.FC<SlotProps & { type: 'push' | 'overlay'; overlays: OverlayStart }> = ({
  label,
  type,
  overlays,
  onOpenChange,
}) => {
  const overlayRef = useRef<OverlayRef | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    const ref = overlays.openFlyoutTemplate(
      {
        id: `pushPaddingSystemFlyout-${label}`,
        session: 'start',
        type,
        size: 's',
        resizable: true,
        minWidth: FLYOUT_MIN_WIDTH,
      },
      ({ onClose }) => (
        <FlyoutTemplate onClose={onClose}>
          <FlyoutTemplate.Header title={label} />
          <FlyoutTemplate.Body>
            <EuiText>
              <p>
                System flyout, <EuiCode>type=&quot;{type}&quot;</EuiCode>,{' '}
                <EuiCode>session=&quot;start&quot;</EuiCode>. Renders in its own React root and
                shares the singleton flyout manager store.
              </p>
            </EuiText>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      )
    );
    // The `onClose` open option only fires for closes routed through the template. `ref.close()`
    // (our Close button) unmounts without it, so sync state from the ref's promise instead.
    ref.onClose.then(() => {
      overlayRef.current = null;
      setIsOpen(false);
      onOpenChange(false);
    });
    overlayRef.current = ref;
    setIsOpen(true);
    onOpenChange(true);
  };

  const close = () => {
    overlayRef.current?.close();
  };

  useEffect(
    () => () => {
      overlayRef.current?.close();
    },
    []
  );

  return (
    <EuiButton
      size="s"
      color={isOpen ? 'danger' : 'primary'}
      onClick={isOpen ? close : open}
      data-test-subj={`pushPaddingToggle-${label}`}
    >
      {isOpen ? `Close ${label}` : `Open ${label}`}
    </EuiButton>
  );
};

const EUI_PUSH_PADDING_PR = 'https://github.com/elastic/eui/pull/10063';
const EUI_BACKGROUNDED_MAIN_PR = 'https://github.com/elastic/eui/pull/10062';

interface Scenario {
  title: string;
  steps: string;
  /** Behavior on Kibana main with the bundled EUI version. */
  status: 'passing' | 'failing';
  /** What fixes a failing scenario. */
  resolution?: { text: string; href: string; linkText: string };
}

const SCENARIOS: Scenario[] = [
  {
    title: 'Two standalone push flyouts, close oldest first (elastic/eui#9788)',
    steps:
      'Open Standalone A, open Standalone B, close A, close B. Expected: padding back to (none). Bug: padding stays and the "Stranded padding" badge appears.',
    status: 'failing',
    resolution: { text: 'Fixed by', href: EUI_PUSH_PADDING_PR, linkText: 'elastic/eui#10063' },
  },
  {
    title: 'Two standalone push flyouts, close newest first',
    steps:
      'Open Standalone A, open Standalone B, close B. Expected: A is still open and the page stays pushed.',
    status: 'passing',
  },
  {
    title: 'Standalone push + system push, close standalone first',
    steps:
      'Open Standalone A, open System push C, close A. Expected: C is active and the page stays pushed. Bug: padding drops to (none) while C is open.',
    status: 'failing',
    resolution: { text: 'Fixed by', href: EUI_PUSH_PADDING_PR, linkText: 'elastic/eui#10063' },
  },
  {
    title: 'Standalone push under a system overlay',
    steps:
      'Open Standalone A, open System overlay E, close E. Expected: A keeps its padding the whole time. Bug: padding is cleared when E closes while A is still open.',
    status: 'failing',
    resolution: {
      text: 'Needs the resetPushOffsetIfIdle workaround in system_flyout_service.tsx removed once Kibana picks up',
      href: EUI_PUSH_PADDING_PR,
      linkText: 'elastic/eui#10063',
    },
  },
  {
    title: 'Resize a backgrounded push flyout while another push flyout is active',
    steps:
      'Open Standalone A, open System push C, then drag-resize A. Expected: padding keeps following C, the active flyout. Bug: padding jumps to the width of A, and closing A afterwards leaves C unpushed.',
    status: 'failing',
    resolution: { text: 'Fixed by', href: EUI_PUSH_PADDING_PR, linkText: 'elastic/eui#10063' },
  },
  {
    title: 'Two system push sessions (multi-root), close newest first or Back',
    steps:
      'Open System push C, open System push D, then close D or use the flyout Back button, then close C. Expected: padding follows the active push flyout and ends at (none).',
    status: 'passing',
  },
  {
    title: 'Two system push sessions (multi-root), close oldest first',
    steps:
      'Open System push C, open System push D, close C. Expected: D stays open and pushed, closing D ends at (none). Bug: D disappears because closing a backgrounded main closes the foreground session (elastic/eui#10061).',
    status: 'failing',
    resolution: {
      text: 'Fixed by',
      href: EUI_BACKGROUNDED_MAIN_PR,
      linkText: 'elastic/eui#10062',
    },
  },
];

const scenarioListItems = SCENARIOS.map(({ title, steps, status, resolution }) => ({
  title: (
    <>
      {title} <EuiBadge color={status === 'passing' ? 'success' : 'danger'}>{status}</EuiBadge>
    </>
  ),
  description: (
    <>
      {steps}
      {resolution && (
        <>
          {' '}
          {resolution.text}{' '}
          <EuiLink href={resolution.href} target="_blank">
            {resolution.linkText}
          </EuiLink>
          .
        </>
      )}
    </>
  ),
}));

export const PushPaddingScenarios: React.FC<{ overlays: OverlayStart }> = ({ overlays }) => {
  const [openCount, setOpenCount] = useState(0);
  const onOpenChange = (isOpen: boolean) => setOpenCount((count) => count + (isOpen ? 1 : -1));

  return (
    <>
      <EuiTitle size="s">
        <h2>Push padding scenarios</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiText size="s">
          <p>
            Every push flyout below writes inline padding to the same target. Combine them in any
            order to reproduce stale or missing push padding; the readout updates live. Scenario
            status reflects Kibana main with its bundled EUI; each failing one links to its fix.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <PushPaddingReadout openCount={openCount} />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <StandalonePushSlot label="Standalone A" onOpenChange={onOpenChange} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StandalonePushSlot label="Standalone B" onOpenChange={onOpenChange} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SystemSlot
              label="System push C"
              type="push"
              overlays={overlays}
              onOpenChange={onOpenChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SystemSlot
              label="System push D"
              type="push"
              overlays={overlays}
              onOpenChange={onOpenChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SystemSlot
              label="System overlay E"
              type="overlay"
              overlays={overlays}
              onOpenChange={onOpenChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiDescriptionList type="column" listItems={scenarioListItems} />
      </EuiPanel>
    </>
  );
};
