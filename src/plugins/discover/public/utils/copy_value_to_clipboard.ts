/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { cellHasFormulas } from '@kbn/data-plugin/common';
import type { ValueToStringConverter } from '../types';
import { DiscoverServices } from '../build_services';
import { escapeFormattedValue } from './convert_value_to_string';

const WARNING_FOR_FORMULAS = i18n.translate(
  'discover.grid.copyEscapedValueWithFormulasToClipboardWarningText',
  {
    defaultMessage: 'It may contain formulas whose values have been escaped.',
  }
);

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

  const result = valueToStringConverter(rowIndex, columnId);
  const valueFormatted = result.formattedString;

  copyToClipboard(valueFormatted);

  const toastTitle = i18n.translate('discover.grid.copyValueToClipboard.toastTitle', {
    defaultMessage: 'Copied to clipboard',
  });

  if (result.withFormula) {
    toastNotifications.addWarning({
      title: toastTitle,
      text: WARNING_FOR_FORMULAS,
    });
  } else {
    toastNotifications.addInfo({
      title: toastTitle,
    });
  }

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
  let withFormula = cellHasFormulas(columnId);

  const valuesFormatted = [...Array(rowsCount)].map((_, rowIndex) => {
    const result = valueToStringConverter(rowIndex, columnId, { disableMultiline: true });
    withFormula = withFormula || result.withFormula;
    return result.formattedString;
  });

  const textToCopy = `${escapeFormattedValue(columnId)}\n${valuesFormatted.join('\n')}`;

  let copiedWithoutBrowserStyles = false;
  try {
    copiedWithoutBrowserStyles = Boolean(await window.navigator?.clipboard?.writeText(textToCopy));
  } catch (error) {
    if (!copiedWithoutBrowserStyles) {
      copyToClipboard(textToCopy);
    }
  }

  const messageTitle = i18n.translate('discover.grid.copyColumnValuesToClipboard.toastTitle', {
    defaultMessage: 'Copied values of "{column}" column to clipboard',
    values: { column: columnId },
  });

  if (withFormula) {
    toastNotifications.addWarning({
      title: messageTitle,
      text: WARNING_FOR_FORMULAS,
    });
  } else {
    toastNotifications.addInfo({
      title: messageTitle,
    });
  }

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
    title: i18n.translate('discover.grid.copyColumnNameToClipboard.toastTitle', {
      defaultMessage: 'Copied to clipboard',
    }),
  });

  return textToCopy;
};
