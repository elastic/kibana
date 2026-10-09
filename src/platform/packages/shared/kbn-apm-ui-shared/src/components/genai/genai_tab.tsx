/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBasicTable, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { EbtClickAttrsElementOnly } from '@kbn/ebt-click';
import { asInteger } from '../../utils';
import type { GenAiFields } from './get_genai_fields';
import { GenAiFieldValue } from './genai_field_value';
import { GenAiMessages } from './genai_messages';
import { GenAiSection } from './genai_section';

interface DetailRow {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

// Match Discover's result-panel table style: row separators only, no border on first/last row.
const detailTableCss = css`
  thead {
    display: none;
  }
  tr:first-child td {
    border-top: none;
  }
  tr:last-child td {
    border-bottom: none;
  }
`;

const DETAIL_COLUMNS: Array<EuiBasicTableColumn<DetailRow>> = [
  {
    field: 'label' as const,
    name: i18n.translate('apmUiShared.genAi.details.fieldColumnLabel', {
      defaultMessage: 'Field',
    }),
    width: '160px',
    render: (label: React.ReactNode) => (
      <EuiText size="xs">
        <strong>{label}</strong>
      </EuiText>
    ),
  },
  {
    field: 'content' as const,
    name: i18n.translate('apmUiShared.genAi.details.valueColumnLabel', {
      defaultMessage: 'Value',
    }),
    render: (content: React.ReactNode) => content,
  },
];

interface Props {
  genAi: GenAiFields;
  /** When provided, copy-button clicks are tracked via `data-ebt-*` attributes. */
  ebt?: EbtClickAttrsElementOnly;
  /**
   * When provided, replaces the built-in field table — e.g. with the doc
   * viewer's field table that offers filter actions in the Discover context.
   */
  detailsSlot?: React.ReactNode;
}

export function GenAiTab({ genAi, ebt, detailsSlot }: Props) {
  const {
    operationName,
    requestModel,
    responseModel,
    provider,
    inputTokens,
    outputTokens,
    requestParams,
    response,
    inputMessages,
    outputMessages,
    systemInstructions,
    conversationId,
  } = genAi;

  // ── Field rows (single flat table — the former Summary fields lead) ───────
  const detailRows: DetailRow[] = [];

  if (operationName) {
    detailRows.push({
      id: 'operationName',
      label: i18n.translate('apmUiShared.genAi.params.operationName', {
        defaultMessage: 'Operation',
      }),
      content: <GenAiFieldValue value={operationName} />,
    });
  }
  if (requestModel) {
    detailRows.push({
      id: 'requestModel',
      label: i18n.translate('apmUiShared.genAi.params.requestModel', {
        defaultMessage: 'Request model',
      }),
      content: <GenAiFieldValue value={requestModel} />,
    });
  }
  if (provider) {
    detailRows.push({
      id: 'provider',
      label: i18n.translate('apmUiShared.genAi.params.provider', {
        defaultMessage: 'Provider',
      }),
      content: <GenAiFieldValue value={provider} />,
    });
  }
  if (inputTokens !== undefined) {
    detailRows.push({
      id: 'inputTokens',
      label: i18n.translate('apmUiShared.genAi.params.inputTokens', {
        defaultMessage: 'Input tokens',
      }),
      // Same formatting as the waterfall token badges (e.g. 1,438).
      content: <GenAiFieldValue value={asInteger(inputTokens)} />,
    });
  }
  if (outputTokens !== undefined) {
    detailRows.push({
      id: 'outputTokens',
      label: i18n.translate('apmUiShared.genAi.params.outputTokens', {
        defaultMessage: 'Output tokens',
      }),
      content: <GenAiFieldValue value={asInteger(outputTokens)} />,
    });
  }
  if (responseModel) {
    detailRows.push({
      id: 'responseModel',
      label: i18n.translate('apmUiShared.genAi.params.responseModel', {
        defaultMessage: 'Response model',
      }),
      content: <GenAiFieldValue value={responseModel} />,
    });
  }
  if (conversationId) {
    detailRows.push({
      id: 'conversationId',
      label: i18n.translate('apmUiShared.genAi.params.conversationId', {
        defaultMessage: 'Conversation ID',
      }),
      content: <GenAiFieldValue value={conversationId} />,
    });
  }
  if (response.id) {
    detailRows.push({
      id: 'responseId',
      label: i18n.translate('apmUiShared.genAi.params.responseId', {
        defaultMessage: 'Response ID',
      }),
      content: <GenAiFieldValue value={response.id} />,
    });
  }
  if (response.finish_reasons?.length) {
    detailRows.push({
      id: 'finishReasons',
      label: i18n.translate('apmUiShared.genAi.params.finishReasons', {
        defaultMessage: 'Finish reasons',
      }),
      content: <GenAiFieldValue value={response.finish_reasons} />,
    });
  }
  Object.entries(requestParams)
    .filter(([, v]) => v !== undefined)
    .forEach(([key, val]) => {
      detailRows.push({ id: key, label: key, content: <GenAiFieldValue value={val} /> });
    });

  const hasConversation =
    inputMessages.length > 0 || outputMessages.length > 0 || !!systemInstructions;

  return (
    <>
      {/* ── Details: single flat field table in a collapsible section ───── */}
      {(detailsSlot != null || detailRows.length > 0) && (
        <GenAiSection
          id="details"
          title={i18n.translate('apmUiShared.genAi.section.details', {
            defaultMessage: 'Details',
          })}
        >
          {detailsSlot ?? (
            <EuiBasicTable
              itemId="id"
              tableLayout="auto"
              compressed
              items={detailRows}
              columns={DETAIL_COLUMNS}
              data-test-subj="genAiDetails"
              css={detailTableCss}
              tableCaption={i18n.translate('apmUiShared.genAi.section.details.tableCaption', {
                defaultMessage: 'GenAI details',
              })}
            />
          )}
        </GenAiSection>
      )}

      {/* ── Conversation ─────────────────────────────────────────────────── */}
      {hasConversation && (
        <>
          <EuiSpacer size="m" />
          <GenAiSection
            id="conversation"
            title={i18n.translate('apmUiShared.genAi.section.conversation', {
              defaultMessage: 'Conversation',
            })}
          >
            <GenAiMessages
              inputMessages={inputMessages}
              outputMessages={outputMessages}
              systemInstructions={systemInstructions}
              ebt={ebt}
            />
          </GenAiSection>
        </>
      )}
    </>
  );
}
