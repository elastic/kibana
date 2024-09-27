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
    const { setCellPopoverProps, DefaultCellPopover } = props;

    useEffect(() => {
      setCellPopoverProps({
        panelClassName: 'unifiedDataTable__cellPopover',
      });
    }, [setCellPopoverProps]);

    return <DefaultCellPopover {...props} />;
  });

  // Components passed to EUI DataGrid cannot be memoized components
  // otherwise EUI throws an error `typeof Component !== 'function'`
  return (props: EuiDataGridCellPopoverElementProps) => (
    <RenderCustomCellPopoverMemoized {...props} />
  );
};
