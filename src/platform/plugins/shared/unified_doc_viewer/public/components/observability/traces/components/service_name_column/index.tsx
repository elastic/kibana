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
    flattenedDoc['resource.attributes.telemetry.sdk.language'] || flattenedDoc['agent.name'] || '';

  return (
    <HighlightField
      value={flattenedDoc['service.name']}
      formattedValue={formattedDoc['service.name']}
    >
      {({ content }) => (
        <ServiceNameWithIcon agentName={agentName} formattedServiceName={content} />
      )}
    </HighlightField>
  );
}
