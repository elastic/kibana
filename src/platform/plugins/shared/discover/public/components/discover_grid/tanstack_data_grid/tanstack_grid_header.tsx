/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EuiIconTip, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  TanStackColumnHeaderActions,
  type TanStackColumnHeaderActionsHandle,
  type TanStackColumnHeaderActionsProps,
} from './tanstack_column_header_actions';
import type { getTanStackDataGridStyles } from './tanstack_data_grid.styles';

export const TanStackHeaderCellText = React.memo(
  ({
    text,
    styles,
    multiline,
  }: {
    text: string;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    multiline?: boolean;
  }) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    const updateTruncation = useCallback(() => {
      const el = textRef.current;
      if (!el) return;
      setIsTruncated(Math.ceil(el.scrollWidth) > Math.ceil(el.clientWidth));
    }, []);

    useLayoutEffect(() => {
      updateTruncation();
      const frame = requestAnimationFrame(updateTruncation);
      return () => cancelAnimationFrame(frame);
    }, [text, updateTruncation]);

    useEffect(() => {
      const el = textRef.current;
      if (!el) return;
      const observer = new ResizeObserver(updateTruncation);
      observer.observe(el);
      return () => observer.disconnect();
    }, [updateTruncation]);

    const label = (
      <span
        ref={textRef}
        css={[styles.headerCellText, multiline && styles.headerCellTextMultiline]}
      >
        {text}
      </span>
    );

    if (multiline || !isTruncated) {
      return label;
    }

    return (
      <EuiToolTip
        content={text}
        disableScreenReaderOutput
        anchorProps={{ css: styles.headerCellTextTooltipAnchor }}
      >
        {label}
      </EuiToolTip>
    );
  }
);

export const TanStackActionsColumnHeader = React.memo(
  ({ styles }: { styles: ReturnType<typeof getTanStackDataGridStyles> }) => {
    const label = i18n.translate('discover.grid.tanStack.actionsColumnHeader', {
      defaultMessage: 'Actions',
    });
    const iconTip = i18n.translate('discover.grid.tanStack.actionsColumnTooltip', {
      defaultMessage: 'Actions',
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [showLabel, setShowLabel] = useState(true);

    const updateLayout = useCallback(() => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      setShowLabel(container.clientWidth >= measure.scrollWidth);
    }, []);

    useLayoutEffect(() => {
      updateLayout();
      const frame = requestAnimationFrame(updateLayout);
      return () => cancelAnimationFrame(frame);
    }, [label, updateLayout]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const observer = new ResizeObserver(updateLayout);
      observer.observe(container);
      return () => observer.disconnect();
    }, [updateLayout]);

    return (
      <div
        ref={containerRef}
        css={[
          styles.controlHeaderCellContent,
          showLabel && styles.controlHeaderCellContentWithLabel,
        ]}
      >
        <span ref={measureRef} css={styles.controlHeaderCellLabelMeasure} aria-hidden>
          {label}
        </span>
        {showLabel ? (
          <span css={styles.controlHeaderCellLabel}>{label}</span>
        ) : (
          <EuiIconTip
            type="info"
            color="subdued"
            size="m"
            anchorProps={{ css: styles.headerCellIcon }}
            content={iconTip}
          />
        )}
      </div>
    );
  }
);

export const TanStackHeaderActionsBridge = React.memo(
  ({
    children,
    actionsProps,
    styles,
    reserveResizeHandlePadding,
    isHeaderMultiline,
  }: {
    children: React.ReactNode;
    actionsProps: TanStackColumnHeaderActionsProps;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    reserveResizeHandlePadding?: boolean;
    isHeaderMultiline?: boolean;
  }) => {
    const headerActionsRef = useRef<TanStackColumnHeaderActionsHandle>(null);
    const openHeaderActions = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      headerActionsRef.current?.toggle();
    }, []);

    const actionsButtonLabel = i18n.translate(
      'discover.grid.tanStack.columnActionsButtonAriaLabel',
      {
        defaultMessage: '{columnName}. Click to view column header actions.',
        values: { columnName: actionsProps.columnDisplayName },
      }
    );

    return (
      <>
        <button
          type="button"
          css={[
            styles.headerCellInteractive,
            reserveResizeHandlePadding && styles.headerCellInteractiveWithResize,
            isHeaderMultiline && styles.headerCellInteractiveMultiline,
          ]}
          aria-label={actionsButtonLabel}
          aria-haspopup="true"
          data-test-subj={`dataGridHeaderCellActionButton-${actionsProps.columnId}`}
          onClick={openHeaderActions}
        >
          {children}
        </button>
        <TanStackColumnHeaderActions
          ref={headerActionsRef}
          {...actionsProps}
          headerCellPopoverAnchorCss={styles.headerCellPopoverAnchor}
        />
      </>
    );
  }
);

// ── Cell Actions: filter in/out, copy (clippable), expand (always visible) ──
