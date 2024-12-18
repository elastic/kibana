/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiAccordion, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { ExceptionStacktrace, PlaintextStacktrace, Stacktrace } from '@kbn/event-stacktrace';
import type { APMError, AT_TIMESTAMP } from '@kbn/apm-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
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
  const [doc, setDoc] = useState<Record<string, unknown>>();
  const accordionId = useGeneratedHtmlId({
    prefix: stacktraceAccordionTitle,
  });

  const [requestState, esHit] = useEsDocSearch({
    id: hit.raw._id || '',
    index: hit.raw._index,
    dataView,
  });

  useEffect(() => {
    if (requestState === ElasticRequestState.Found && esHit) {
      setDoc(esHit?.raw._source);
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
      isLoading={requestState === ElasticRequestState.Loading}
      isLoadingMessage={true}
    >
      {requestState === ElasticRequestState.Error ||
      requestState === ElasticRequestState.NotFound ? (
        <p>
          {i18n.translate('unifiedDocViewer.stacktrace.errorMessage', {
            defaultMessage: 'Failed to load stacktrace',
          })}
        </p>
      ) : !!doc ? (
        <StacktraceContent doc={doc as unknown as APMError} />
      ) : null}
    </EuiAccordion>
  );
}

function StacktraceContent({
  doc,
}: {
  doc: {
    service: {
      language?: {
        name?: string;
      };
    };
    [AT_TIMESTAMP]: string;
    error: Pick<APMError['error'], 'id' | 'log' | 'stack_trace' | 'exception'>;
  };
}) {
  const codeLanguage = doc?.service.language?.name;
  const exceptions = doc?.error.exception || [];
  const logStackframes = doc?.error.log?.stacktrace;
  const isPlaintextException =
    !!doc.error.stack_trace && exceptions.length === 1 && !exceptions[0].stacktrace;

  if (doc.error.log?.message) {
    return <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />;
  }

  if (doc.error.exception?.length) {
    return isPlaintextException ? (
      <PlaintextStacktrace
        message={exceptions[0].message}
        type={exceptions[0]?.type}
        stacktrace={doc?.error.stack_trace}
        codeLanguage={codeLanguage}
      />
    ) : (
      <ExceptionStacktrace codeLanguage={codeLanguage} exceptions={exceptions} />
    );
  }
}
