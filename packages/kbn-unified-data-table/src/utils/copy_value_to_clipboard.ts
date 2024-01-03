/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToastsStart } from '@kbn/core/public';
import type { ValueToStringConverter } from '../types';
import { convertNameToString } from './convert_value_to_string';

const WARNING_FOR_FORMULAS = i18n.translate(
  'unifiedDataTable.copyEscapedValueWithFormulasToClipboardWarningText',
  {
    defaultMessage: 'Values may contain formulas that are escaped.',
  }
);
const COPY_FAILED_ERROR_MESSAGE = i18n.translate('unifiedDataTable.copyFailedErrorText', {
  defaultMessage: 'Unable to copy to clipboard in this browser',
});

export const copyValueToClipboard = ({
  rowIndex,
  columnId,
  toastNotifications,
  valueToStringConverter,
}: {
  rowIndex: number;
  columnId: string;
  toastNotifications: ToastsStart;
  valueToStringConverter: ValueToStringConverter;
}): string | null => {
  const result = valueToStringConverter(rowIndex, columnId);
  const valueFormatted = result.formattedString;

  const copied = copyToClipboard(valueFormatted);

  if (!copied) {
    toastNotifications.addWarning({
      title: COPY_FAILED_ERROR_MESSAGE,
    });

    return null;
  }

  const toastTitle = i18n.translate('unifiedDataTable.copyValueToClipboard.toastTitle', {
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
  columnDisplayName,
  toastNotifications,
  valueToStringConverter,
  rowsCount,
}: {
  columnId: string;
  columnDisplayName: string;
  toastNotifications: ToastsStart;
  valueToStringConverter: ValueToStringConverter;
  rowsCount: number;
}): Promise<string | null> => {
  const nameFormattedResult = convertNameToString(columnDisplayName);
  let withFormula = nameFormattedResult.withFormula;

  const valuesFormatted = [...Array(rowsCount)].map((_, rowIndex) => {
    const result = valueToStringConverter(rowIndex, columnId, { compatibleWithCSV: true });
    withFormula = withFormula || result.withFormula;
    return result.formattedString;
  });

  const textToCopy = `${nameFormattedResult.formattedString}\n${valuesFormatted.join('\n')}`;

  let copied;
  try {
    // try to copy without browser styles
    await window.navigator?.clipboard?.writeText(textToCopy);
    copied = true;
  } catch (error) {
    copied = copyToClipboard(textToCopy);
  }

  if (!copied) {
    toastNotifications.addWarning({
      title: COPY_FAILED_ERROR_MESSAGE,
    });

    return null;
  }

  const toastTitle = i18n.translate('unifiedDataTable.copyColumnValuesToClipboard.toastTitle', {
    defaultMessage: 'Values of "{column}" column copied to clipboard',
    values: { column: columnDisplayName },
  });

  if (withFormula) {
    toastNotifications.addWarning({
      title: toastTitle,
      text: WARNING_FOR_FORMULAS,
    });
  } else {
    toastNotifications.addInfo({
      title: toastTitle,
    });
  }

  return textToCopy;
};

export const copyColumnNameToClipboard = ({
  columnDisplayName,
  toastNotifications,
}: {
  columnDisplayName: string;
  toastNotifications: ToastsStart;
}): string | null => {
  const copied = copyToClipboard(columnDisplayName);

  if (!copied) {
    toastNotifications.addWarning({
      title: COPY_FAILED_ERROR_MESSAGE,
    });

    return null;
  }

  const toastTitle = i18n.translate('unifiedDataTable.copyColumnNameToClipboard.toastTitle', {
    defaultMessage: 'Copied to clipboard',
  });

  toastNotifications.addInfo({
    title: toastTitle,
  });

  return columnDisplayName;
};
