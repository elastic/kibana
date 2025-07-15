/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { getFlattenedSpanDocumentOverview, getSpanDocumentOverview } from '@kbn/discover-utils/src';
import {
  OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
  AGENT_NAME_FIELD,
  SERVICE_NAME_FIELD,
} from '@kbn/discover-utils';
import { HighlightField } from '../highlight_field';
import ServiceNameWithIcon from '../service_name_with_icon';

// eslint-disable-next-line import/no-default-export
export default function ServiceNameColumn({
  dataView,
  fieldFormats,
  row,
}: DataGridCellValueElementProps) {
  const { formattedDoc, flattenedDoc } = useMemo(
    () => ({
      formattedDoc: getSpanDocumentOverview(row, { dataView, fieldFormats }),
      flattenedDoc: getFlattenedSpanDocumentOverview(row),
    }),
    [dataView, fieldFormats, row]
  );

  const agentName =
    flattenedDoc[OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE] ||
    flattenedDoc[AGENT_NAME_FIELD] ||
    '';

  return (
    <HighlightField
      value={flattenedDoc[SERVICE_NAME_FIELD]}
      formattedValue={formattedDoc[SERVICE_NAME_FIELD]}
    >
      {({ content }) => (
        <ServiceNameWithIcon agentName={agentName} formattedServiceName={content} />
      )}
    </HighlightField>
  );
}
