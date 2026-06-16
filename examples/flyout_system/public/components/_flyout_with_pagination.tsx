/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiProvider,
  EuiSpacer,
  EuiText,
  EuiTitle,
  getFlyoutManagerStore,
  useEuiTheme,
} from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';
import { useBooleanUrlState } from '@kbn/shared-url-state';

import { FLYOUT_MIN_WIDTH } from '../utils';
import { FlyoutDocument } from './_flyout_document';
import { MOCK_DOCUMENTS } from './demo_documents';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Read pagination for a specific flyout from the singleton EUI store. */
const useStorePagination = (flyoutId: string) => {
  const store = getFlyoutManagerStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().flyouts.find((f) => f.flyoutId === flyoutId)?.pagination
  );
};

// ─── Prop-based pagination (same React root) ──────────────────────────────────

const PROP_FLYOUT_ID = 'pagination-example-prop';

const PropBasedPagination: React.FC = () => {
  const [isOpen, setIsOpen] = useBooleanUrlState('paginationPropOpen');
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = MOCK_DOCUMENTS.length;

  const pagination = {
    currentIndex,
    total,
    onPrevious: useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []),
    onNext: useCallback(() => setCurrentIndex((i) => Math.min(total - 1, i + 1)), [total]),
  };

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          The flyout body and menu bar share the same React root. Pass{' '}
          <EuiCode>flyoutMenuProps.pagination</EuiCode> — EUI manages mutual exclusion with the back
          button automatically.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButton disabled={isOpen} onClick={() => setIsOpen(true)}>
        Open flyout
      </EuiButton>

      {isOpen && (
        <EuiFlyout
          id={PROP_FLYOUT_ID}
          session="start"
          size="m"
          minWidth={FLYOUT_MIN_WIDTH}
          aria-labelledby="propPaginationFlyoutTitle"
          onClose={() => setIsOpen(false)}
          flyoutMenuProps={{ pagination }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2 id="propPaginationFlyoutTitle">{MOCK_DOCUMENTS[currentIndex].title}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <FlyoutDocument document={MOCK_DOCUMENTS[currentIndex]} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButtonEmpty onClick={() => setIsOpen(false)}>Close</EuiButtonEmpty>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
};

// ─── Store-based pagination (separate React roots) ────────────────────────────

const CROSS_ROOT_FLYOUT_ID = 'pagination-example-cross-root';

/**
 * Simulates a data grid rendered in a separate React root (e.g. a Kibana embeddable).
 * Row clicks call getFlyoutManagerStore().setPagination() to drive the flyout menu bar.
 */
const DataGridInExternalRoot: React.FC<{
  flyoutId: string;
  isFlyoutOpen: boolean;
}> = ({ flyoutId, isFlyoutOpen }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = MOCK_DOCUMENTS.length;

  useEffect(() => {
    if (!isFlyoutOpen) return;
    const store = getFlyoutManagerStore();
    store.setPagination(flyoutId, {
      currentIndex,
      total,
      onPrevious: () => setCurrentIndex((i) => Math.max(0, i - 1)),
      onNext: () => setCurrentIndex((i) => Math.min(total - 1, i + 1)),
    });
    return () => {
      store.setPagination(flyoutId, undefined);
    };
  }, [flyoutId, currentIndex, total, isFlyoutOpen]);

  return (
    <div style={{ padding: '8px 0' }}>
      <EuiText size="s">
        <strong>Data grid (separate React root)</strong>
      </EuiText>
      <EuiText size="xs" color="subdued">
        <p>
          Clicking a row calls <EuiCode>getFlyoutManagerStore().setPagination()</EuiCode>
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {MOCK_DOCUMENTS.map((doc, i) => (
        <div key={doc.title} style={{ marginBottom: 4 }}>
          <EuiButton
            size="s"
            color={i === currentIndex ? 'primary' : 'text'}
            onClick={() => setCurrentIndex(i)}
          >
            Row {i + 1}: {doc.title}
          </EuiButton>
        </div>
      ))}
    </div>
  );
};

const CrossRootPagination: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { colorMode } = useEuiTheme();
  const dataGridContainerRef = useRef<HTMLDivElement | null>(null);
  const dataGridRootRef = useRef<Root | null>(null);

  // Create the external root once
  useLayoutEffect(() => {
    if (!dataGridContainerRef.current) return;
    const root = createRoot(dataGridContainerRef.current);
    dataGridRootRef.current = root;
    return () => {
      root.unmount();
      dataGridRootRef.current = null;
    };
  }, []);

  // Re-render into the existing root when colorMode or isOpen changes
  useLayoutEffect(() => {
    if (!dataGridRootRef.current) return;
    dataGridRootRef.current.render(
      <EuiProvider colorMode={colorMode}>
        <DataGridInExternalRoot flyoutId={CROSS_ROOT_FLYOUT_ID} isFlyoutOpen={isOpen} />
      </EuiProvider>
    );
  }, [colorMode, isOpen]);

  // Read the current pagination from the store so the flyout body stays in sync
  const pagination = useStorePagination(CROSS_ROOT_FLYOUT_ID);
  const document = MOCK_DOCUMENTS[pagination?.currentIndex ?? 0];

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          The data grid below renders in a <strong>separate React root</strong> (simulating a Kibana
          embeddable or legacy app). It calls{' '}
          <EuiCode>getFlyoutManagerStore().setPagination()</EuiCode> on row selection to drive the
          flyout menu bar. Use <EuiCode>flyoutMenuDisplayMode=&quot;always&quot;</EuiCode> so the
          menu bar renders before the first store update arrives.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {/* Container for the external React root */}
      <div ref={dataGridContainerRef} />
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={() => setIsOpen(true)} disabled={isOpen}>
        Re-open flyout
      </EuiButton>

      {isOpen && (
        <EuiFlyout
          id={CROSS_ROOT_FLYOUT_ID}
          session="start"
          flyoutMenuDisplayMode="always"
          size="m"
          minWidth={FLYOUT_MIN_WIDTH}
          ownFocus={false}
          aria-label="Document details"
          onClose={() => setIsOpen(false)}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2>{document.title}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <FlyoutDocument document={document} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export interface FlyoutWithPaginationProps {
  overlays: OverlayStart;
}

export const FlyoutWithPagination: React.FC<FlyoutWithPaginationProps> = () => (
  <>
    <EuiTitle>
      <h2>Flyout pagination</h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>
        Pagination controls replace the back/history slot in the menu bar — the two are mutually
        exclusive. There are two ways to drive pagination depending on whether the flyout body and
        menu bar share a React root.
      </p>
    </EuiText>
    <EuiSpacer size="m" />

    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          Prop-based — <EuiCode>flyoutMenuProps.pagination</EuiCode>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <PropBasedPagination />
    </EuiPanel>

    <EuiSpacer size="m" />

    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          Store-based — <EuiCode>getFlyoutManagerStore().setPagination()</EuiCode>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <CrossRootPagination />
    </EuiPanel>
  </>
);
