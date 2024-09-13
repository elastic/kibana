/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
  getShouldShowFieldHandler,
} from '@kbn/discover-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import * as constants from '../../../../../common/data_types/logs/constants';
import { formatJsonDocumentForContent } from './utils';

const SourceDocument = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_document')
);

interface ContentProps extends DataGridCellValueElementProps {
  isSingleLine?: boolean;
}

const LogMessage = ({
  field,
  value,
  className,
}: {
  field?: string;
  value: string;
  className: string;
}) => {
  const renderFieldPrefix = field && field !== constants.MESSAGE_FIELD;
  return (
    <EuiText size="xs" className={className}>
      {renderFieldPrefix && <strong data-test-subj="discoverDataTableMessageKey">{field} </strong>}
      <span data-test-subj="discoverDataTableMessageValue">{value}</span>
    </EuiText>
  );
};

export const Content = ({ row, dataView, fieldFormats, columnId, isSingleLine }: ContentProps) => {
  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const shouldRenderContent = !!field && !!value;

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, true);
  }, [dataView]);

  const formattedRow = useMemo(() => formatJsonDocumentForContent(row), [row]);

  return shouldRenderContent ? (
    <LogMessage field={field} value={value} className={isSingleLine ? 'eui-textTruncate' : ''} />
  ) : (
    <SourceDocument
      columnId={columnId}
      dataTestSubj="discoverCellDescriptionList"
      dataView={dataView}
      fieldFormats={fieldFormats}
      maxEntries={50}
      row={formattedRow}
      shouldShowFieldHandler={shouldShowFieldHandler}
      useTopLevelObjectColumns={false}
    />
  );
};
