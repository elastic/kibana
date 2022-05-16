/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/public';
import { formatFieldValue } from './format_value';
import { ElasticSearchHit, HitsFlattened } from '../types';
import { DiscoverServices } from '../build_services';

interface CopyParams {
  rowIndex: number;
  rows: ElasticSearchHit[];
  rowsFlattened: HitsFlattened;
  columnId: string;
  dataView: DataView;
  services: DiscoverServices;
}

const getValueAsTextToCopy = ({
  rowIndex,
  rows,
  rowsFlattened,
  columnId,
  dataView,
  services,
}: CopyParams): string => {
  const { fieldFormats } = services;
  const rowFlattened = rowsFlattened[rowIndex];
  const field = dataView.fields.getByName(columnId);
  const value = rowFlattened[columnId];

  return field?.type === '_source'
    ? JSON.stringify(rowFlattened, null, 2)
    : formatFieldValue(value, rows[rowIndex], fieldFormats, dataView, field, 'text');
};

export const copyValueToClipboard = ({
  rowIndex,
  rows,
  rowsFlattened,
  columnId,
  dataView,
  services,
}: CopyParams) => {
  const { toastNotifications } = services;

  const valueFormatted = getValueAsTextToCopy({
    rowIndex,
    rows,
    rowsFlattened,
    columnId,
    dataView,
    services,
  });

  copyToClipboard(valueFormatted);

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyValueToClipboardToastTitle', {
      defaultMessage: 'Copied to clipboard.',
    }),
  });
};

export const copyColumnValuesToClipboard = async ({
  rows,
  rowsFlattened,
  columnId,
  dataView,
  services,
}: Omit<CopyParams, 'rowIndex'>) => {
  const { toastNotifications } = services;

  const valuesFormatted = rowsFlattened.map((row, rowIndex) =>
    getValueAsTextToCopy({
      rowIndex,
      rows,
      rowsFlattened,
      columnId,
      dataView,
      services,
    })
  );

  const textToCopy = valuesFormatted.join('\n');

  let copiedWithoutBrowserStyles = false;
  try {
    copiedWithoutBrowserStyles = Boolean(await window.navigator?.clipboard?.writeText(textToCopy));
  } catch (error) {
    if (!copiedWithoutBrowserStyles) {
      copyToClipboard(textToCopy);
    }
  }

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyColumnValuesToClipboardToastTitle', {
      defaultMessage: 'Copied values of "{column}" column to clipboard.',
      values: { column: columnId },
    }),
  });
};

export const copyColumnNameToClipboard = ({
  columnId,
  services,
}: Pick<CopyParams, 'columnId' | 'services'>) => {
  const { toastNotifications } = services;

  copyToClipboard(columnId);

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyColumnNameToClipboardToastTitle', {
      defaultMessage: 'Copied to clipboard.',
    }),
  });
};
