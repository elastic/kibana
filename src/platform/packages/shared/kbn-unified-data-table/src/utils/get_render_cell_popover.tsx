/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import React, { memo, useEffect } from 'react';
import { SOURCE_COLUMN } from './columns';

const FIELDS_WITH_WIDE_POPOVER = [SOURCE_COLUMN];

/*
 *
 * A custom cell popover render helps consumer of unified data table
 * to get handle of unifiedDataTables's popover content and customize it.
 *
 * Default implementation is simply a pass through with just custom className.
 * Consumers also have the ability to provide custom render functions
 *
 * */
export const getCustomCellPopoverRenderer = () => {
  const RenderCustomCellPopoverMemoized = memo(function RenderCustomCellPopoverMemoized(
    props: EuiDataGridCellPopoverElementProps
  ) {
    const { columnId, setCellPopoverProps, DefaultCellPopover } = props;

    useEffect(() => {
      const popoverProps: Parameters<typeof setCellPopoverProps>[0] = {
        panelClassName: 'unifiedDataTable__cellPopover',
      };

      const shouldRenderWidePopover = FIELDS_WITH_WIDE_POPOVER.includes(columnId);
      if (shouldRenderWidePopover) {
        popoverProps.panelProps = { css: { maxInlineSize: 'min(75vw, 600px) !important' } };
      }

      setCellPopoverProps(popoverProps);
    }, [columnId, setCellPopoverProps]);

    return <DefaultCellPopover {...props} />;
  });

  // Components passed to EUI DataGrid cannot be memoized components
  // otherwise EUI throws an error `typeof Component !== 'function'`
  return (props: EuiDataGridCellPopoverElementProps) => (
    <RenderCustomCellPopoverMemoized {...props} />
  );
};
