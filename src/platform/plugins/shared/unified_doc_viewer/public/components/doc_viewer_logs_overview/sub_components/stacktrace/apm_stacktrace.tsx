/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { ExceptionStacktrace, PlaintextStacktrace, Stacktrace } from '@kbn/event-stacktrace';
import type { APMError } from '@kbn/apm-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '../../../../hooks';

export const APM_ERROR_DATASTREAM_FIELDS = {
  dataStreamType: 'logs',
  dataStreamDataset: 'apm.error',
};

export function ApmStacktrace({ hit, dataView }: { hit: DataTableRecord; dataView: DataView }) {
  const [apmErrorDoc, setApmErrorDoc] = useState<APMError>();

  const [requestState, esHit] = useEsDocSearch({
    id: hit.raw._id || '',
    index: hit.raw._index,
    dataView,
  });

  useEffect(() => {
    if (requestState === ElasticRequestState.Found && esHit) {
      setApmErrorDoc(esHit?.raw._source as unknown as APMError);
    }
  }, [requestState, esHit]);

  if (requestState === ElasticRequestState.Loading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (requestState === ElasticRequestState.Error || requestState === ElasticRequestState.NotFound) {
    return (
      <p data-test-subj="unifiedDocViewerApmStacktraceErrorMsg">
        {i18n.translate('unifiedDocViewer.apmStacktrace.errorMessage', {
          defaultMessage: 'Failed to load stacktrace',
        })}
      </p>
    );
  }

  const codeLanguage = apmErrorDoc?.service?.language?.name;
  const exceptions = apmErrorDoc?.error?.exception || [];
  const logStackframes = apmErrorDoc?.error?.log?.stacktrace;
  const isPlaintextException =
    !!apmErrorDoc?.error?.stack_trace && exceptions.length === 1 && !exceptions[0].stacktrace;

  if (apmErrorDoc?.error?.log?.message) {
    return <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />;
  }

  if (apmErrorDoc?.error?.exception?.length) {
    return isPlaintextException ? (
      <PlaintextStacktrace
        message={exceptions[0].message}
        type={exceptions[0]?.type}
        stacktrace={apmErrorDoc?.error.stack_trace}
        codeLanguage={codeLanguage}
      />
    ) : (
      <ExceptionStacktrace codeLanguage={codeLanguage} exceptions={exceptions} />
    );
  }

  return null;
}
