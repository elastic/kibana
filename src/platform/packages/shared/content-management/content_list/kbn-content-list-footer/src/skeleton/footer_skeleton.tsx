/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonRectangle } from '@elastic/eui';

/** Approximate height of EUI's table pagination row. */
const FOOTER_ROW_HEIGHT = 32;

/** Width of the "Rows per page" menu button. */
const ROWS_PER_PAGE_WIDTH = 140;

/** Width of a single pagination button (prev / page number / next). */
const PAGINATION_BUTTON_WIDTH = 32;

/** Number of pagination button placeholders rendered on the right. */
const PAGINATION_BUTTON_COUNT = 6;

/**
 * Props for {@link FooterSkeleton}.
 */
export interface FooterSkeletonProps {
  /** Optional `data-test-subj`. */
  'data-test-subj'?: string;
}

/**
 * Loading-state placeholder for `ContentListFooter`.
 *
 * Mirrors the real pagination layout: "Rows per page" selector on the
 * left, a row of pagination buttons on the right. Swap-in parity — no
 * vertical shift when the real footer replaces the skeleton.
 */
export const FooterSkeleton = ({
  'data-test-subj': dataTestSubj = 'contentListFooter-skeleton',
}: FooterSkeletonProps) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiSkeletonRectangle
          isLoading
          width={ROWS_PER_PAGE_WIDTH}
          height={FOOTER_ROW_HEIGHT}
          borderRadius="s"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          {Array.from({ length: PAGINATION_BUTTON_COUNT }, (_unused, idx) => (
            <EuiFlexItem key={idx} grow={false}>
              <EuiSkeletonRectangle
                isLoading
                width={PAGINATION_BUTTON_WIDTH}
                height={FOOTER_ROW_HEIGHT}
                borderRadius="s"
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
