/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import  { ReactNode } from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';

import { createGridColumns } from './table_vis_columns';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

describe('table vis columns', () => {
  describe('filtering', () => {
    it('should fire filter event and reset page on filter click', () => {
      const fireEvent = jest.fn();
      const closeCellPopover = jest.fn();
      const changePage = jest.fn();
      const columns = createGridColumns(
        [
          {
            name: 'a',
            meta: { type: 'number' },
            id: 'a',
          },
        ],
        [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }],
        {
          a: {
            title: 'Test',
            formatter: { convert: (x: unknown) => x } as unknown as FieldFormat,
            filterable: true,
          },
        },
        [],
        fireEvent,
        closeCellPopover,
        changePage
      );

      // call `onClick` of passed down react component of first cell action
      (
        (
          columns[0].cellActions![0] as unknown as (
            props: EuiDataGridColumnCellActionProps
          ) => ReactNode
        )({
          rowIndex: 0,
          columnId: 'a',
          colIndex: 0,
          isExpanded: true,
          Component: () => null,
        }) as unknown as { props: { onClick: () => void } }
      ).props!.onClick();
      expect(fireEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'filter',
        })
      );
      expect(changePage).toHaveBeenCalledWith(0);
      expect(closeCellPopover).toHaveBeenCalled();
    });
  });
});
