/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock } from '@elastic/eui';
import { DataTableRecord, fieldConstants, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { APM_ERROR_DATASTREAM_FIELDS, ApmStacktrace } from './apm_stacktrace';

export function StacktraceContent({ hit, dataView }: { hit: DataTableRecord; dataView: DataView }) {
  const errorStackTrace = getFieldValue(hit, fieldConstants.ERROR_STACK_TRACE) as string;
  const dataStreamTypeField = getFieldValue(hit, fieldConstants.DATASTREAM_TYPE_FIELD) as string;
  const dataStreamDatasetField = getFieldValue(
    hit,
    fieldConstants.DATASTREAM_DATASET_FIELD
  ) as string;

  if (
    dataStreamTypeField === APM_ERROR_DATASTREAM_FIELDS.dataStreamType &&
    dataStreamDatasetField === APM_ERROR_DATASTREAM_FIELDS.dataStreamDataset
  ) {
    return <ApmStacktrace hit={hit} dataView={dataView} />;
  }

  if (errorStackTrace) {
    return <EuiCodeBlock isCopyable={true}>{errorStackTrace}</EuiCodeBlock>;
  }

  return (
    <p>
      {i18n.translate('unifiedDocViewer.stacktraceSection.errorMessage', {
        defaultMessage: 'Failed to load stacktrace',
      })}
    </p>
  );
}
