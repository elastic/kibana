/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import React, { useEffect } from 'react';

export const WorkflowTriggerEventDataGridCellPopover = (
  props: EuiDataGridCellPopoverElementProps
): React.JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const { DefaultCellPopover, setCellPopoverProps } = props;

  useEffect(() => {
    setCellPopoverProps({
      zIndex: Math.max(Number(euiTheme.levels.toast), Number(euiTheme.levels.modal)) + 1,
    });
  }, [euiTheme.levels.modal, euiTheme.levels.toast, setCellPopoverProps]);

  return <DefaultCellPopover {...props} />;
};

WorkflowTriggerEventDataGridCellPopover.displayName = 'WorkflowTriggerEventDataGridCellPopover';
