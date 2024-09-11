/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiText } from '@elastic/eui';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import {
  getLogDocumentOverview,
  getMessageFieldWithFallbacks,
  getShouldShowFieldHandler,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { dynamic } from '@kbn/shared-ux-utility';
import * as constants from '../../../../../common/data_types/logs/constants';

const SourceDocument = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_document')
);

const DiscoverSourcePopoverContent = dynamic(
  () => import('@kbn/unified-data-table/src/components/source_popover_content')
);

interface ContentProps extends DataGridCellValueElementProps {
  isSingleLine?: boolean;
}

const LogMessage = ({
  field,
  value,
  isSingleLine,
}: {
  field?: string;
  value: string;
  isSingleLine?: boolean;
}) => {
  const renderFieldPrefix = field && field !== constants.MESSAGE_FIELD;
  return (
    <EuiText size="xs" className={isSingleLine ? 'eui-textTruncate' : ''}>
      {renderFieldPrefix && <strong data-test-subj="discoverDataTableMessageKey">{field} </strong>}
      <span data-test-subj="discoverDataTableMessageValue">{value}</span>
    </EuiText>
  );
};

const SourcePopoverContent = ({
  row,
  columnId,
  closePopover,
}: {
  row: DataTableRecord;
  columnId: string;
  closePopover: () => void;
}) => {
  const closeButton = (
    <EuiButtonIcon
      aria-label={i18n.translate('discover.logs.grid.closePopover', {
        defaultMessage: `Close popover`,
      })}
      data-test-subj="docTableClosePopover"
      iconSize="s"
      iconType="cross"
      size="xs"
      onClick={closePopover}
    />
  );
  return (
    <DiscoverSourcePopoverContent
      row={row}
      columnId={columnId}
      closeButton={closeButton}
      useTopLevelObjectColumns={false}
    />
  );
};

export const Content = ({
  row,
  dataView,
  fieldFormats,
  isDetails,
  columnId,
  closePopover,
  isSingleLine,
}: ContentProps) => {
  const documentOverview = getLogDocumentOverview(row, { dataView, fieldFormats });
  const { field, value } = getMessageFieldWithFallbacks(documentOverview);
  const renderLogMessage = field && value;

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, true);
  }, [dataView]);

  const formattedRow = useMemo(() => {
    return formatJsonDocumentForContent(row);
  }, [row]);

  if (isDetails && !renderLogMessage) {
    return (
      <SourcePopoverContent row={formattedRow} columnId={columnId} closePopover={closePopover} />
    );
  }

  return renderLogMessage ? (
    <LogMessage field={field} value={value} isSingleLine={isSingleLine} />
  ) : (
    <SourceDocument
      useTopLevelObjectColumns={false}
      row={formattedRow}
      dataView={dataView}
      columnId={columnId}
      fieldFormats={fieldFormats}
      shouldShowFieldHandler={shouldShowFieldHandler}
      maxEntries={50}
      dataTestSubj="discoverCellDescriptionList"
    />
  );
};

export const formatJsonDocumentForContent = (row: DataTableRecord) => {
  const flattenedResult: DataTableRecord['flattened'] = {};
  const rawFieldResult: DataTableRecord['raw']['fields'] = {};
  const { raw, flattened } = row;
  const { fields } = raw;
  console.log('Compute', raw._id);

  // We need 2 loops here for flattened and raw.fields. Flattened contains all fields,
  // whereas raw.fields only contains certain fields excluding _ignored
  for (const key in flattened) {
    if (
      !constants.FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT.some((prefix) => key.startsWith(prefix))
    ) {
      flattenedResult[key] = flattened[key];
    }
  }

  for (const key in fields) {
    if (
      !constants.FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT.some((prefix) => key.startsWith(prefix))
    ) {
      rawFieldResult[key] = fields[key];
    }
  }

  return {
    ...row,
    flattened: flattenedResult,
    raw: {
      ...raw,
      fields: rawFieldResult,
    },
  };
};
