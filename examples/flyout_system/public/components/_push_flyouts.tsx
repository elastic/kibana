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
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayRef, OverlayStart } from '@kbn/core/public';
import { FlyoutTemplate } from '@kbn/flyout-template';

import { FLYOUT_MIN_WIDTH } from '../utils';

const APP_MAIN_SCROLL_ID = 'app-main-scroll';

/** Labels contain spaces, which are not valid in `id` or `data-test-subj` references. */
const slug = (label: string) => label.replace(/\s+/g, '');

const readPagePadding = () =>
  document.getElementById(APP_MAIN_SCROLL_ID)?.style.paddingInlineEnd ?? '';

/** Live view of the inline `padding-inline-end` EUI writes on the app scroll container. */
const PagePadding: React.FC = () => {
  const [padding, setPadding] = useState(readPagePadding);

  useEffect(() => {
    const container = document.getElementById(APP_MAIN_SCROLL_ID);
    if (!container) return;
    const observer = new MutationObserver(() => setPadding(readPagePadding()));
    observer.observe(container, { attributes: true, attributeFilter: ['style'] });
    setPadding(readPagePadding());
    return () => observer.disconnect();
  }, []);

  return <strong data-test-subj="pushFlyoutPagePadding">{padding || '(none)'}</strong>;
};

/** Rendered pixel width of the enclosing `.euiFlyout`, updated on every resize. */
const RenderedWidth: React.FC<{ label: string }> = ({ label }) => {
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const flyout = ref.current?.closest<HTMLElement>('.euiFlyout');
    if (!flyout) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.round(flyout.getBoundingClientRect().width))
    );
    observer.observe(flyout);
    return () => observer.disconnect();
  }, []);

  return (
    <EuiText size="s">
      <p>
        Rendered width:{' '}
        <strong ref={ref} data-test-subj={`pushFlyoutRenderedWidth-${slug(label)}`}>
          {width === null ? '…' : `${width}px`}
        </strong>
      </p>
    </EuiText>
  );
};

/** A plain `EuiFlyout` with `session="never"`, rendered in this app's React root. */
const StandalonePushFlyout: React.FC<{ label: string }> = ({ label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = `pushFlyoutTitle-${slug(label)}`;

  return (
    <>
      <EuiButton
        size="s"
        color={isOpen ? 'danger' : 'primary'}
        onClick={() => setIsOpen(!isOpen)}
        data-test-subj={`pushFlyoutToggle-${slug(label)}`}
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
          onClose={() => setIsOpen(false)}
          aria-labelledby={titleId}
          data-test-subj={`pushFlyout-${slug(label)}`}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={titleId}>{label}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                Standalone <EuiCode>type=&quot;push&quot;</EuiCode> flyout, not managed by a
                session.
              </p>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

interface SystemFlyoutProps {
  label: string;
  type: 'push' | 'overlay';
  overlays: OverlayStart;
  /** When set, the flyout opens at this width and reports resizes back, like Security alert flyouts. */
  storedWidth?: number;
  onResize?: (width: number) => void;
}

/** A system flyout opened with `core.overlays.openFlyoutTemplate`: own React root, new session. */
const SystemFlyout: React.FC<SystemFlyoutProps> = ({
  label,
  type,
  overlays,
  storedWidth,
  onResize,
}) => {
  const overlayRef = useRef<OverlayRef | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    const ref = overlays.openFlyoutTemplate(
      {
        id: `pushFlyout-${slug(label)}`,
        'data-test-subj': `pushFlyout-${slug(label)}`,
        session: 'start',
        type,
        size: storedWidth ?? 's',
        resizable: true,
        minWidth: FLYOUT_MIN_WIDTH,
        onResize,
      },
      ({ onClose }) => (
        <FlyoutTemplate onClose={onClose}>
          <FlyoutTemplate.Header title={label} />
          <FlyoutTemplate.Body>
            <EuiText size="s">
              <p>
                System flyout, <EuiCode>type=&quot;{type}&quot;</EuiCode>. Renders in its own React
                root.
              </p>
            </EuiText>
            <RenderedWidth label={label} />
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      )
    );
    // `ref.close()` (our toggle) bypasses the template's `onClose`, so sync from the ref instead.
    ref.onClose.then(() => {
      overlayRef.current = null;
      setIsOpen(false);
    });
    overlayRef.current = ref;
    setIsOpen(true);
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
      onClick={isOpen ? () => overlayRef.current?.close() : open}
      data-test-subj={`pushFlyoutToggle-${slug(label)}`}
    >
      {isOpen ? `Close ${label}` : `Open ${label}`}
    </EuiButton>
  );
};

export const PushFlyouts: React.FC<{ overlays: OverlayStart }> = ({ overlays }) => {
  const [storedWidth, setStoredWidth] = useState<number>();

  return (
    <>
      <EuiTitle size="s">
        <h2>Push flyouts</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiText size="s">
          <p>
            Open and close these flyouts in any order. Push flyouts make room by padding the page,
            and the padding should always match the widest open push flyout. The system push flyouts
            remember their last resized width, the way Security alert flyouts do.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l" wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              Page padding: <PagePadding />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              Remembered width:{' '}
              <strong data-test-subj="pushFlyoutStoredWidth">
                {storedWidth === undefined ? '(none)' : `${storedWidth}px`}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <StandalonePushFlyout label="Standalone A" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StandalonePushFlyout label="Standalone B" />
          </EuiFlexItem>
          {['System push C', 'System push D'].map((label) => (
            <EuiFlexItem grow={false} key={label}>
              <SystemFlyout
                label={label}
                type="push"
                overlays={overlays}
                storedWidth={storedWidth}
                onResize={setStoredWidth}
              />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <SystemFlyout label="System overlay E" type="overlay" overlays={overlays} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
