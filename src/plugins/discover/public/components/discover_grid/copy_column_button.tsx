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
import { DataView } from '@kbn/data-views-plugin/common';
import { ElasticSearchHit, HitsFlattened } from '../../types';
import {
  copyColumnValuesToClipboard,
  copyColumnNameToClipboard,
} from '../../utils/copy_to_clipboard';
import { DiscoverServices } from '../../build_services';

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

export function buildCopyColumnNameButton(
  columnName: string,
  services: DiscoverServices
): EuiListGroupItemProps | null {
  if (columnName === '_source') {
    return null;
  }
  return buildCopyColumnButton({
    label: (
      <FormattedMessage
        id="discover.grid.copyColumnNameToClipBoardButton"
        defaultMessage="Copy name"
      />
    ),
    onCopy: () => copyColumnNameToClipboard({ columnId: columnName, services }),
  });
}

export function buildCopyColumnValuesButton(
  columnName: string,
  rows: ElasticSearchHit[],
  rowsFlattened: HitsFlattened,
  dataView: DataView | undefined,
  services: DiscoverServices
): EuiListGroupItemProps | null {
  if (!dataView) {
    return null;
  }
  return buildCopyColumnButton({
    label: (
      <FormattedMessage
        id="discover.grid.copyColumnValuesToClipBoardButton"
        defaultMessage="Copy column"
      />
    ),
    onCopy: () =>
      copyColumnValuesToClipboard({
        columnId: columnName,
        rows,
        rowsFlattened,
        dataView,
        services,
      }),
  });
}
