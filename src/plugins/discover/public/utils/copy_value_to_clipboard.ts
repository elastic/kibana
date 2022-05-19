/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ValueToStringConverter } from '../types';
import { DiscoverServices } from '../build_services';

export const copyValueToClipboard = ({
  rowIndex,
  columnId,
  services,
  valueToStringConverter,
}: {
  rowIndex: number;
  columnId: string;
  services: DiscoverServices;
  valueToStringConverter: ValueToStringConverter;
}) => {
  const { toastNotifications } = services;

  const valueFormatted = valueToStringConverter(rowIndex, columnId, { allowMultiline: true });

  copyToClipboard(valueFormatted);

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyValueToClipboardToastTitle', {
      defaultMessage: 'Copied to clipboard.',
    }),
  });
};

export const copyColumnValuesToClipboard = async ({
  columnId,
  services,
  valueToStringConverter,
  rowsCount,
}: {
  columnId: string;
  services: DiscoverServices;
  valueToStringConverter: ValueToStringConverter;
  rowsCount: number;
}) => {
  const { toastNotifications } = services;

  const valuesFormatted = [...Array(rowsCount)].map((_, rowIndex) => {
    return valueToStringConverter(rowIndex, columnId, { allowMultiline: false });
  });

  const textToCopy = `${columnId}\n${valuesFormatted.join('\n')}`;

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
}: {
  columnId: string;
  services: DiscoverServices;
}) => {
  const { toastNotifications } = services;

  copyToClipboard(columnId);

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyColumnNameToClipboardToastTitle', {
      defaultMessage: 'Copied to clipboard.',
    }),
  });
};
