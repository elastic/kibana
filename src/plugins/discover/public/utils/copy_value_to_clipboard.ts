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
}): string => {
  const { toastNotifications } = services;

  const valueFormatted = valueToStringConverter(rowIndex, columnId);

  copyToClipboard(valueFormatted);

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyValueToClipboardToastTitle', {
      defaultMessage: 'Copied to clipboard.',
    }),
  });

  return valueFormatted;
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
}): Promise<string> => {
  const { toastNotifications } = services;

  const valuesFormatted = [...Array(rowsCount)].map((_, rowIndex) => {
    return valueToStringConverter(rowIndex, columnId, { disableMultiline: true });
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

  return textToCopy;
};

export const copyColumnNameToClipboard = ({
  columnId,
  services,
}: {
  columnId: string;
  services: DiscoverServices;
}): string => {
  const { toastNotifications } = services;

  const textToCopy = columnId;
  copyToClipboard(textToCopy);

  toastNotifications.addInfo({
    title: i18n.translate('discover.grid.copyColumnNameToClipboardToastTitle', {
      defaultMessage: 'Copied to clipboard.',
    }),
  });

  return textToCopy;
};
