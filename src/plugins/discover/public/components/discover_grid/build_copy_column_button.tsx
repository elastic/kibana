/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiListGroupItemProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { copyColumnValuesToClipboard, copyColumnNameToClipboard } from './utils/copy_to_clipboard';
import { DiscoverServices } from '../../build_services';
import type { ValueToStringConverter } from '../../types';

function buildCopyColumnButton({
  label,
  onCopy,
}: {
  label: EuiListGroupItemProps['label'];
  onCopy: () => unknown;
}) {
  const copyToClipBoardButton: EuiListGroupItemProps = {
    size: 'xs',
    label,
    iconType: 'copyClipboard',
    iconProps: { size: 'm' },
    onClick: onCopy,
  };

  return copyToClipBoardButton;
}

export function buildCopyColumnNameButton({
  columnId,
  services,
}: {
  columnId: string;
  services: DiscoverServices;
}): EuiListGroupItemProps {
  return buildCopyColumnButton({
    label: (
      <FormattedMessage
        id="discover.grid.copyColumnNameToClipBoardButton"
        defaultMessage="Copy name"
      />
    ),
    onCopy: () => copyColumnNameToClipboard({ columnId, services }),
  });
}

export function buildCopyColumnValuesButton({
  columnId,
  services,
  formatValueAsTextToCopy,
  rowsCount,
}: {
  columnId: string;
  services: DiscoverServices;
  formatValueAsTextToCopy: ValueToStringConverter;
  rowsCount: number;
}): EuiListGroupItemProps {
  return buildCopyColumnButton({
    label: (
      <FormattedMessage
        id="discover.grid.copyColumnValuesToClipBoardButton"
        defaultMessage="Copy column"
      />
    ),
    onCopy: async () =>
      await copyColumnValuesToClipboard({
        columnId,
        services,
        formatValueAsTextToCopy,
        rowsCount,
      }),
  });
}
