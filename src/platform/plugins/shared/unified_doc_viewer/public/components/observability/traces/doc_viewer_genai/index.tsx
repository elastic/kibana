/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCode, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { GenAiTab } from '@kbn/apm-ui-shared';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
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
  const isEsqlMode = Array.isArray(textBasedHits);
  const { genAi, loading, unrecoverableLongFields } = useGenAiData({ hit, isEsqlMode });

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

  // Whether values were dropped is unknowable without `_ignored`, so this is
  // phrased as a possibility. Suppressed once a conversation renders, to avoid
  // pointing at an absent `system_instructions` on an otherwise complete span.
  const conversationEmpty =
    genAi.inputMessages.length === 0 &&
    genAi.outputMessages.length === 0 &&
    !genAi.systemInstructions;
  const showMetadataHint = unrecoverableLongFields && conversationEmpty;

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
      {showMetadataHint && (
        <>
          <KbnInfoCallout
            announceOnMount
            data-test-subj="unifiedDocViewerObsTracesGenAiMetadataHint"
            title={
              <FormattedMessage
                id="unifiedDocViewer.observability.traces.genAi.metadataHint.title"
                defaultMessage="Messages may be incomplete"
              />
            }
            text={
              <FormattedMessage
                id="unifiedDocViewer.observability.traces.genAi.metadataHint.description"
                defaultMessage="Messages longer than 1024 characters aren't indexed and must be read from the document source. Add {metadata} to your query to load them."
                values={{
                  metadata: (
                    <EuiCode css={{ display: 'inline-block' }}>{'METADATA _id, _index'}</EuiCode>
                  ),
                }}
              />
            }
          />
          <EuiSpacer size="m" />
        </>
      )}
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
