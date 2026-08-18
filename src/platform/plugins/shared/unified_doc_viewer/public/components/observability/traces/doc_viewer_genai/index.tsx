/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { GenAiTab } from '@kbn/apm-ui-shared';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useState } from 'react';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../../../doc_viewer_source/get_height';
import { TRACES_DOC_VIEWER_EBT_ELEMENTS } from '../ebt_constants';
import { GenAiDetailsTable, hasGenAiDetailFields } from './genai_details_table';
import { useGenAiData } from './use_genai_data';

export function DocViewerObsTracesGenAi({
  hit,
  dataView,
  columnsMeta,
  textBasedHits,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
  decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
}: DocViewRenderProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { genAi, loading } = useGenAiData({ hit });

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy)
    : 0;

  if (loading) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={5} data-test-subj="unifiedDocViewerObsTracesGenAiLoading" />
      </>
    );
  }

  if (!genAi) {
    return null;
  }

  return (
    <div
      ref={setContainerRef}
      data-test-subj="unifiedDocViewerObsTracesGenAi"
      css={
        containerHeight
          ? css`
              max-height: ${containerHeight}px;
              overflow: auto;
            `
          : undefined
      }
    >
      <EuiSpacer size="m" />
      <GenAiTab
        genAi={genAi}
        ebt={{ element: TRACES_DOC_VIEWER_EBT_ELEMENTS.GENAI_TAB }}
        detailsSlot={
          hasGenAiDetailFields(hit.flattened) ? (
            <GenAiDetailsTable
              hit={hit}
              dataView={dataView}
              columnsMeta={columnsMeta}
              textBasedHits={textBasedHits}
              filter={filter}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
              columns={columns}
            />
          ) : undefined
        }
      />
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default DocViewerObsTracesGenAi;
