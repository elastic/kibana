/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SPAN_DURATION_FIELD,
  TRANSACTION_ID_FIELD,
  getTraceDocumentOverview,
} from '@kbn/discover-utils';
import { FieldActionsProvider } from '../../../../hooks/use_field_actions';
import { TransactionProvider } from './hooks/use_transaction';
import { spanFields } from './resources/fields';
import { getSpanFieldConfiguration } from './resources/get_span_field_configuration';
import { SpanSummaryField } from './sub_components/span_summary_field';
import { SpanDurationSummary } from './sub_components/span_duration_summary';
import { FieldWithActions } from '../components/field_with_actions/field_with_actions';
import { Timestamp } from '../components/timestamp';
import { TraceIdLink } from '../components/trace_id_link';

export type SpanOverviewProps = DocViewRenderProps & {
  transactionIndexPattern: string;
};

const FIELD_SPAN_DURATION = 'duration';
const FIELD_SPAN_NAME = 'name';

export function SpanOverview({
  columns,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  transactionIndexPattern,
}: SpanOverviewProps) {
  const parsedDoc = getTraceDocumentOverview(hit);
  const spanDuration = parsedDoc[FIELD_SPAN_DURATION];
  console.log({ columns, hit, filter, transactionIndexPattern, parsedDoc });
  return (
    <FieldActionsProvider
      columns={columns}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
    >
      <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
        <EuiSpacer size="m" />
        <EuiTitle size="s" css={{ border: '1px dotted lightGray' }}>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>name</code>
            </EuiBadge>
            <h2>{parsedDoc[FIELD_SPAN_NAME]}</h2>
          </div>
        </EuiTitle>
        <EuiText size="xs" color="subdued" css={{ border: '1px dotted lightGray' }}>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>span_id</code>
            </EuiBadge>
            {parsedDoc.span_id}
          </div>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText size="xs">
          <p>
            <em>
              A{' '}
              <a href="https://opentelemetry.io/docs/specs/otel/trace/api/#span" target="_blank">
                Span
              </a>{' '}
              represents a single operation within a trace. Spans can be nested to form a trace
              tree. Each trace contains a root span, which typically describes the entire operation
              and, optionally, one or more sub-spans for its sub-operations.
            </em>
          </p>
          <p>
            <em>In addition to name and ID, OpenTelemetry spans have these fields:</em>
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <div css={{ border: '1px dotted lightGray', paddingTop: '2em' }}>
          <EuiBadge css={{ float: 'right', marginTop: '-2em' }}>
            <a
              href="https://opentelemetry.io/docs/specs/otel/trace/api/#spancontext"
              target="_blank"
            >
              <code>SpanContext</code>
            </a>
          </EuiBadge>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>span_id</code>
            </EuiBadge>
            <FieldWithActions
              data-test-subj="unifiedDocViewerObservabilityTracesAttribute-span_id"
              label="Span ID"
              field="span_id"
              value={parsedDoc['span_id']}
              fieldMetadata={{}}
            >
              <TraceIdLink traceId={parsedDoc['span_id']} />
            </FieldWithActions>
            <EuiHorizontalRule margin="xs" />
          </div>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>trace_id</code>
            </EuiBadge>
            <FieldWithActions
              data-test-subj="unifiedDocViewerObservabilityTracesAttribute-trace_id"
              label="Trace ID"
              field="trace_id"
              value={parsedDoc['trace_id']}
              fieldMetadata={{}}
            >
              <TraceIdLink traceId={parsedDoc['trace_id']} />
            </FieldWithActions>
            <EuiHorizontalRule margin="xs" />
          </div>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>trace_state</code>
            </EuiBadge>
            <FieldWithActions
              data-test-subj="unifiedDocViewerObservabilityTracesAttribute-trace_id"
              label="Trace state"
              field="trace_state"
              value={parsedDoc['trace_state']}
              fieldMetadata={{}}
            >
              <EuiText size="xs">{parsedDoc['trace_state']}</EuiText>
            </FieldWithActions>
            <EuiHorizontalRule margin="xs" />
          </div>
        </div>
        <div>
          <EuiBadge css={{ float: 'right' }}>
            <code>parent_span_id</code>
          </EuiBadge>
          <FieldWithActions
            data-test-subj="unifiedDocViewerObservabilityTracesAttribute-parent_span_id"
            label="Parent span ID"
            field="parent_span_id"
            value={parsedDoc['parent_span_id']}
            fieldMetadata={{}}
          >
            <EuiText size="xs">{parsedDoc['parent_span_id']}</EuiText>
          </FieldWithActions>
          <EuiHorizontalRule margin="xs" />
        </div>
        <div>
          <EuiBadge css={{ float: 'right' }}>
            <code>kind</code>
          </EuiBadge>
          <FieldWithActions
            data-test-subj="unifiedDocViewerObservabilityTracesAttribute-kind"
            label="Kind"
            field="parent_span_id"
            value={parsedDoc['kind']}
            fieldMetadata={{}}
          >
            <EuiText size="xs">{parsedDoc['kind']}</EuiText>
          </FieldWithActions>
          <EuiHorizontalRule margin="xs" />
        </div>
        <div>
          <EuiBadge css={{ float: 'right' }}>
            <code>@timestamp</code>
          </EuiBadge>
          <FieldWithActions
            data-test-subj="unifiedDocViewerObservabilityTracesAttribute-timestamp"
            label="Start timestamp"
            field="@timestamp"
            value={parsedDoc['@timestamp']}
            fieldMetadata={{}}
          >
            <Timestamp timestamp={parsedDoc['@timestamp']} />
          </FieldWithActions>
          <EuiHorizontalRule margin="xs" />
        </div>
        <div css={{ border: '1px dotted lightGray', paddingTop: '2em' }}>
          <EuiBadge css={{ float: 'right', marginTop: '-2em' }}>
            <a
              href="https://opentelemetry.io/docs/specs/otel/trace/api/#set-status"
              target="_blank"
            >
              Status
            </a>
          </EuiBadge>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>status.code</code>
            </EuiBadge>
            <FieldWithActions
              data-test-subj="unifiedDocViewerObservabilityTracesAttribute-status.code"
              label="Status code"
              field="status.code"
              value={parsedDoc['status.code']}
              fieldMetadata={{}}
            >
              <EuiBadge>{parsedDoc['status.code']}</EuiBadge>
            </FieldWithActions>
            <EuiHorizontalRule margin="xs" />
          </div>
          <div>
            <EuiBadge css={{ float: 'right' }}>
              <code>status.description</code>
            </EuiBadge>
            <FieldWithActions
              data-test-subj="unifiedDocViewerObservabilityTracesAttribute-status.description"
              label="Status description"
              field="status.description"
              value={parsedDoc['status.description']}
              fieldMetadata={{}}
            >
              <EuiText size="xs">{parsedDoc['status.description']}</EuiText>
            </FieldWithActions>
            <EuiHorizontalRule margin="xs" />
          </div>
        </div>
        {spanDuration && (
          <>
            <EuiSpacer size="m" />
            <SpanDurationSummary duration={spanDuration} />
          </>
        )}
        <EuiSpacer size="m" />
        <div>
          <EuiTitle size="s">
            <h3>Events</h3>
          </EuiTitle>{' '}
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <em>
              Events that happened during the span can are recorded as{' '}
              <a href="https://opentelemetry.io/docs/specs/otel/trace/api/#add-events">
                Span Events
              </a>{' '}
              or{' '}
              <a href="https://opentelemetry.io/docs/specs/otel/logs/data-model/#log-and-event-record-definition">
                logs
              </a>
              . Filtering logs by{' '}
              <a
                href="https://opentelemetry.io/docs/specs/otel/trace/api/#spancontext"
                target="_blank"
              >
                <code>SpanContext</code>
              </a>{' '}
              will give you this list of events:
              <EuiCodeBlock isCopyable={true}>
                FROM logs-* | WHERE span_id == "{parsedDoc['span_id']}" AND trace_id == "
                {parsedDoc['trace_id']}"{' '}
              </EuiCodeBlock>
            </em>
          </EuiText>
        </div>
        <EuiSpacer size="m" />
        <EuiTitle size="s">
          <h3>Entities</h3>
        </EuiTitle>{' '}
        <EuiSpacer size="m" />
        <EuiText size="xs">
          <p>
            <em>TODO: Show how attributes are grouped into entities.</em>
          </p>
        </EuiText>
        <EuiBadge css={{ float: 'right' }}>
          <span role="img" aria-label="Teacher hat">
            🎓
          </span>{' '}
          Teacher Edition
        </EuiBadge>
      </EuiPanel>
    </FieldActionsProvider>
  );
}
