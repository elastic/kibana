/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '../types';
import { DiscoverServices } from '../build_services';
import { convertNameToString } from './convert_value_to_string';

const WARNING_FOR_FORMULAS = i18n.translate(
  'discover.grid.copyEscapedValueWithFormulasToClipboardWarningText',
  {
    defaultMessage: 'Values may contain formulas that are escaped.',
  }
);
const COPY_FAILED_ERROR_MESSAGE = i18n.translate('discover.grid.copyFailedErrorText', {
  defaultMessage: 'Unable to copy to clipboard in this browser',
});

export const copyValueToClipboard = ({
  row,
  columnId,
  services,
}: {
  row: DataTableRecord;
  columnId: string;
  services: DiscoverServices;
}): string | null => {
  const { toastNotifications } = services;

  const result = row.renderText!(columnId);
  const valueFormatted = result.formattedString;

  const copied = copyToClipboard(valueFormatted);

  if (!copied) {
    toastNotifications.addWarning({
      title: COPY_FAILED_ERROR_MESSAGE,
    });

    return null;
  }

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
  rows,
}: {
  columnId: string;
  services: DiscoverServices;
  rows: DataTableRecord[];
}): Promise<string | null> => {
  const { toastNotifications } = services;
  const nameFormattedResult = convertNameToString(columnId);
  let withFormula = nameFormattedResult.withFormula;

  const valuesFormatted = rows.map((row) => {
    const result = row.renderText!(columnId);
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

  const toastTitle = i18n.translate('discover.grid.copyColumnValuesToClipboard.toastTitle', {
    defaultMessage: 'Values of "{column}" column copied to clipboard',
    values: { column: columnId },
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
  columnId,
  services,
}: {
  columnId: string;
  services: DiscoverServices;
}): string | null => {
  const { toastNotifications } = services;

  const nameFormattedResult = convertNameToString(columnId);
  const textToCopy = nameFormattedResult.formattedString;
  const copied = copyToClipboard(textToCopy);

  if (!copied) {
    toastNotifications.addWarning({
      title: COPY_FAILED_ERROR_MESSAGE,
    });

    return null;
  }

  const toastTitle = i18n.translate('discover.grid.copyColumnNameToClipboard.toastTitle', {
    defaultMessage: 'Copied to clipboard',
  });

  if (nameFormattedResult.withFormula) {
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
