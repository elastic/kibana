/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  return memo(function RenderCustomCellPopover(props: EuiDataGridCellPopoverElementProps) {
    const { setCellPopoverProps, DefaultCellPopover } = props;

    useEffect(() => {
      setCellPopoverProps({
        panelClassName: 'unifiedDataTable__cellPopover',
      });
    }, [setCellPopoverProps]);

    return <DefaultCellPopover {...props} />;
  });
};
