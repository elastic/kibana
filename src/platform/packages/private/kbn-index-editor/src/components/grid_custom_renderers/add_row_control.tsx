/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import React from 'react';
import type { IndexUpdateService } from '../../index_update_service';

export const getAddRowControl =
  (indexUpdateService: IndexUpdateService) =>
  (Control: RowControlComponent, props: RowControlRowProps) => {
    const onAddRow = (atIndex: number) => {
      indexUpdateService.addEmptyRow(atIndex);
    };

    return (
      <div className="dataGrid__addRowAction" css={{ position: 'relative', top: -2 }}>
        <Control
          iconType="plus"
          label="Add row"
          tooltipContent="Add row"
          onClick={({ rowIndex }) => onAddRow(rowIndex + 1)}
        />
      </div>
    );
  };
