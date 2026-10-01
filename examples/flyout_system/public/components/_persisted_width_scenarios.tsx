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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayRef, OverlayStart } from '@kbn/core/public';
import { FlyoutTemplate } from '@kbn/flyout-template';

import { FLYOUT_MIN_WIDTH } from '../utils';

const EUI_SIBLING_CLAMP_PR = 'https://github.com/elastic/eui/pull/10075';

/** Labels contain spaces, which are not valid in `id` / `aria-labelledby` references. */
const slug = (label: string) => label.replace(/\s+/g, '-');

/** Shows the rendered pixel width of the enclosing `.euiFlyout`, updated on every resize. */
const RenderedWidth: React.FC<{ label: string }> = ({ label }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const flyout = ref.current?.closest<HTMLElement>('.euiFlyout');
    if (!flyout) return;
    const update = () => setWidth(Math.round(flyout.getBoundingClientRect().width));
    const observer = new ResizeObserver(update);
    observer.observe(flyout);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <EuiText size="s">
      <p>
        Rendered width:{' '}
        <strong ref={ref} data-test-subj={`persistedWidthRendered-${slug(label)}`}>
          {width === null ? '…' : `${width}px`}
        </strong>
      </p>
    </EuiText>
  );
};

interface SlotProps {
  label: string;
  overlays: OverlayStart;
  storedWidth: number | undefined;
  onResize: (width: number) => void;
}

/**
 * Mirrors how Security opens its alert flyouts: a system push flyout that opens at the last
 * resized pixel width when one is stored, otherwise at the default named size.
 */
const PersistedWidthSlot: React.FC<SlotProps> = ({ label, overlays, storedWidth, onResize }) => {
  const overlayRef = useRef<OverlayRef | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    const ref = overlays.openFlyoutTemplate(
      {
        id: `persistedWidthFlyout-${slug(label)}`,
        session: 'start',
        type: 'push',
        size: storedWidth ?? 's',
        resizable: true,
        minWidth: FLYOUT_MIN_WIDTH,
        onResize,
      },
      ({ onClose }) => (
        <FlyoutTemplate onClose={onClose}>
          <FlyoutTemplate.Header title={label} />
          <FlyoutTemplate.Body>
            <RenderedWidth label={label} />
            <EuiText size="s">
              <p>
                Opened with <EuiCode>size: {storedWidth ?? "'s'"}</EuiCode>. Drag the left edge to
                store a new width.
              </p>
            </EuiText>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      )
    );
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
      data-test-subj={`persistedWidthToggle-${label}`}
    >
      {isOpen ? `Close ${label}` : `Open ${label}`}
    </EuiButton>
  );
};

export const PersistedWidthScenarios: React.FC<{ overlays: OverlayStart }> = ({ overlays }) => {
  const [storedWidth, setStoredWidth] = useState<number>();

  return (
    <>
      <EuiTitle size="s">
        <h2>Persisted width scenarios</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiText size="s">
          <p>
            Both flyouts share one stored width, the way Security alert flyouts remember their
            resized width across opens. Open P, drag it wider than about half the page, then open Q.
            Expected: Q opens at the stored width. Bug: Q opens narrower because EUI clamps a new
            main flyout against the previous, still rendered main flyout as if it were a sibling
            (the width then alternates on every open). Fixed by{' '}
            <EuiLink href={EUI_SIBLING_CLAMP_PR} target="_blank">
              elastic/eui#10075
            </EuiLink>
            . <EuiBadge color="danger">failing</EuiBadge>
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              Stored width:{' '}
              <strong data-test-subj="persistedWidthStoredValue">
                {storedWidth === undefined ? '(none)' : `${storedWidth}px`}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PersistedWidthSlot
              label="Persisted push P"
              overlays={overlays}
              storedWidth={storedWidth}
              onResize={setStoredWidth}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PersistedWidthSlot
              label="Persisted push Q"
              overlays={overlays}
              storedWidth={storedWidth}
              onResize={setStoredWidth}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
