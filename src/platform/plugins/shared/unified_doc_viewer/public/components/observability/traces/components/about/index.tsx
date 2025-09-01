/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { TIMESTAMP_FIELD, type DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  HTTP_RESPONSE_STATUS_CODE,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '@kbn/apm-types';
import { EuiPanel } from '@elastic/eui';
import { ContentFrameworkTable } from '../../../../content_framework';
import { aboutFieldConfigurations } from './field_configurations';

export interface AboutProps
  extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn'> {
  hit: DataTableRecord;
  displayType: 'span' | 'transaction';
  dataView: DocViewRenderProps['dataView'];
}

// TODO replace the top section in overview with this one
export const About = ({
  hit,
  displayType,
  dataView,
  filter,
  onAddColumn,
  onRemoveColumn,
}: AboutProps) => {
  // TODO: Add any missing field names and distinguish between span and transaction types (displayType).
  // Not sure yet whether this check should happen here or outside.
  const fieldNames = [
    SERVICE_NAME,
    SPAN_DURATION,
    SPAN_DESTINATION_SERVICE_RESOURCE,
    TIMESTAMP_FIELD,
    HTTP_RESPONSE_STATUS_CODE,
    SPAN_TYPE,
    SPAN_SUBTYPE,
  ];

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <ContentFrameworkTable
        fieldNames={fieldNames}
        id={'aboutTable'}
        fieldConfigurations={aboutFieldConfigurations}
        dataView={dataView}
        hit={hit}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      />
    </EuiPanel>
  );
};
