/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EuiAccordion,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { ExceptionStacktrace, PlaintextStacktrace, Stacktrace } from '@kbn/event-stacktrace';
import type { APMError, AT_TIMESTAMP } from '@kbn/apm-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { FormattedMessage } from '@kbn/i18n-react';
// import { getStacktraceFields, LogDocument } from '@kbn/discover-utils/src';
import { useEsDocSearch } from '../../hooks';

const stacktraceAccordionTitle = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.title.stacktrace',
  {
    defaultMessage: 'Stacktrace',
  }
);

export function LogsOverviewStacktrace({
  hit,
  dataView,
}: {
  hit: DataTableRecord;
  dataView: DataView;
}) {
  // const stacktrace = getStacktraceFields(hit as LogDocument);
  // const hasValue = Object.values(stacktrace).some(Boolean);

  const accordionId = useGeneratedHtmlId({
    prefix: stacktraceAccordionTitle,
  });
  const [source, setSource] = useState<Record<string, unknown>>();

  const [requestState, esHit] = useEsDocSearch({
    id: hit.raw._id || '',
    index: hit.raw._index,
    dataView,
  });

  useEffect(() => {
    if (requestState === ElasticRequestState.Found && esHit) {
      setSource(esHit?.raw._source);
    }
  }, [requestState, esHit]);

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <EuiTitle size="xs">
          <p>{stacktraceAccordionTitle}</p>
        </EuiTitle>
      }
      paddingSize="m"
      initialIsOpen={false}
      data-test-subj="unifiedDocViewLogsOverviewStacktraceAccordion"
    >
      <StacktraceContent error={source as unknown as APMError} requestState={requestState} />
    </EuiAccordion>
  );
}

function StacktraceContent({
  error,
  requestState,
}: {
  requestState: ElasticRequestState;
  error: {
    service: {
      language?: {
        name?: string;
      };
    };
    [AT_TIMESTAMP]: string;
    error: Pick<APMError['error'], 'id' | 'log' | 'stack_trace' | 'exception'>;
  };
}) {
  if (requestState === ElasticRequestState.Error || requestState === ElasticRequestState.NotFound) {
    return (
      <p>
        {' '}
        {i18n.translate('unifiedDocViewer.stacktrace.errorMessage', {
          defaultMessage: 'Stacktrace is not available',
        })}
      </p>
    );
  }

  if (requestState === ElasticRequestState.Loading || error === undefined) {
    return (
      <div className="sourceViewer__loading">
        <EuiLoadingSpinner className="sourceViewer__loadingSpinner" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage id="unifiedDocViewer.loadingStacktrace" defaultMessage="Loading" />
        </EuiText>
      </div>
    );
  }

  const codeLanguage = error?.service.language?.name;
  const exceptions = error?.error.exception || [];
  const logStackframes = error?.error.log?.stacktrace;
  const isPlaintextException =
    !!error.error.stack_trace && exceptions.length === 1 && !exceptions[0].stacktrace;

  if (error.error.log?.message) {
    return <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />;
  }

  if (error.error.exception?.length) {
    return isPlaintextException ? (
      <PlaintextStacktrace
        message={exceptions[0].message}
        type={exceptions[0]?.type}
        stacktrace={error?.error.stack_trace}
        codeLanguage={codeLanguage}
      />
    ) : (
      <ExceptionStacktrace codeLanguage={codeLanguage} exceptions={exceptions} />
    );
  }
}
