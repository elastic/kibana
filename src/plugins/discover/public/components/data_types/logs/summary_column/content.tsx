/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable react/no-danger */

import React, { useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
} from '@elastic/eui';
import { SourceDocument, type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  ShouldShowFieldInTableHandler,
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';
import * as constants from '../../../../../common/data_types/logs/constants';
import { formatJsonDocumentForContent } from './utils';

interface ContentProps extends DataGridCellValueElementProps {
  isCompressed: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

const LogMessage = ({
  field,
  value,
  isCompressed,
}: {
  field: string;
  value: string;
  isCompressed: boolean;
}) => {
  const shouldRenderFieldName = field !== constants.MESSAGE_FIELD;

  if (shouldRenderFieldName) {
    return (
      <EuiDescriptionList
        type="inline"
        compressed={isCompressed}
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
      >
        <EuiDescriptionListTitle className="unifiedDataTable__descriptionListTitle">
          {field}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          data-test-subj="discoverDataTableMessageValue"
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </EuiDescriptionList>
    );
  }

  return (
    <span
      data-test-subj="discoverDataTableMessageValue"
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
};

export const Content = ({
  columnId,
  dataView,
  fieldFormats,
  isCompressed,
  row,
  shouldShowFieldHandler,
}: ContentProps) => {
  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const shouldRenderContent = !!field && !!value;

  return shouldRenderContent ? (
    <LogMessage field={field} value={value} isCompressed={isCompressed} />
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
