/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { copyToClipboard, EuiListGroupItemProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

function buildCopyColumnButton({
  label,
  textToCopy,
}: {
  label: EuiListGroupItemProps['label'];
  textToCopy: string;
}) {
  const copyToClipBoardButton: EuiListGroupItemProps = {
    size: 'xs',
    label,
    iconType: 'copyClipboard',
    iconProps: { size: 'm' },
    onClick: () => copyToClipboard(textToCopy),
  };

  return copyToClipBoardButton;
}

export function buildCopyColumnNameButton(columnName: string) {
  return buildCopyColumnButton({
    label: (
      <FormattedMessage
        id="discover.grid.copyColumnNameToClipBoardButton"
        defaultMessage="Copy name"
      />
    ),
    textToCopy: columnName,
  });
}

export function buildCopyColumnValuesButton(columnName: string) {
  return buildCopyColumnButton({
    label: (
      <FormattedMessage
        id="discover.grid.copyColumnValuesToClipBoardButton"
        defaultMessage="Copy column"
      />
    ),
    textToCopy: columnName,
  });
}
