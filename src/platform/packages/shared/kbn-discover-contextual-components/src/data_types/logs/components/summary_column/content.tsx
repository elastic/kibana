/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { SourceDocument, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  ShouldShowFieldInTableHandler,
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';
import { MESSAGE_FIELD } from '@kbn/discover-utils';
import { formatJsonDocumentForContent } from './utils';

interface ContentProps extends DataGridCellValueElementProps {
  isCompressed: boolean;
  isSingleLine?: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

const LogMessage = ({
  field,
  value,
  className,
}: {
  field: string;
  value: string;
  className: string;
}) => {
  const shouldRenderFieldName = field !== MESSAGE_FIELD;

  if (shouldRenderFieldName) {
    return (
      <div className={className}>
        <strong>{field}</strong>{' '}
        <span
          className={className}
          data-test-subj="discoverDataTableMessageValue"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
    );
  }

  return (
    <p
      className={className}
      data-test-subj="discoverDataTableMessageValue"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
};

export const Content = ({
  columnId,
  dataView,
  fieldFormats,
  isCompressed,
  isSingleLine = false,
  row,
  shouldShowFieldHandler,
}: ContentProps) => {
  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const shouldRenderContent = !!field && !!value;

  return shouldRenderContent ? (
    <LogMessage field={field} value={value} className={isSingleLine ? 'eui-textTruncate' : ''} />
  ) : (
    <FormattedSourceDocument
      columnId={columnId}
      dataView={dataView}
      fieldFormats={fieldFormats}
      shouldShowFieldHandler={shouldShowFieldHandler}
      isCompressed={isCompressed}
      row={row}
    />
  );
};

type FormattedSourceDocumentProps = Pick<
  ContentProps,
  'columnId' | 'dataView' | 'fieldFormats' | 'isCompressed' | 'row' | 'shouldShowFieldHandler'
>;

const FormattedSourceDocument = ({ row, ...props }: FormattedSourceDocumentProps) => {
  const formattedRow = useMemo(() => formatJsonDocumentForContent(row), [row]);

  return (
    <SourceDocument
      maxEntries={50}
      row={formattedRow}
      useTopLevelObjectColumns={false}
      {...props}
    />
  );
};
