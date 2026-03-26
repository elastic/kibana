/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps, useCallback, useMemo } from 'react';
import { render, screen } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '.';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { MockGroupData } from '../__fixtures__/types';

interface RenderComponentProps
  extends Pick<ComponentProps<typeof DataCascade>, 'onCascadeGroupingChange'>,
    Omit<DataCascadeRowProps<MockGroupData, any>, 'children'>,
    Omit<DataCascadeRowCellProps<MockGroupData, any>, 'children'> {
  query: string;
  dataRecordCount: number;
}

const generateGroupRecord = (
  groupByFields: string[],
  nodePath?: string[],
  nodePathMap?: Record<string, string>
) => {
  return groupByFields.reduce((acc, field) => {
    return {
      ...acc,
      [field]:
        nodePathMap && nodePath?.indexOf(field) !== -1 ? nodePathMap[field] : faker.lorem.word(),
    };
  }, {});
};

function renderESQLUseCaseComponent({
  query,
  dataRecordCount = 1000,
  onCascadeGroupingChange,
  rowHeaderTitleSlot,
  rowHeaderActions,
  rowHeaderMetaSlots,
  onCascadeLeafNodeExpanded,
  onCascadeGroupNodeExpanded,
}: RenderComponentProps) {
  const { groupByFields } = getESQLStatsQueryMeta(query);

  render(
    React.createElement(
      function ESQLCascadeTestComponent({
        recordCount,
        groupBy,
      }: {
        recordCount?: number;
        groupBy: string[];
      }) {
        const initData: MockGroupData[] = useMemo(
          () =>
            new Array(recordCount).fill(null).map(() => {
              return {
                id: faker.string.uuid(),
                count: faker.number.int({ min: 1, max: 100 }),
                ...generateGroupRecord(groupBy),
              };
            }),
          [groupBy, recordCount]
        );

        const tableTitleSlot = useCallback<
          NonNullable<ComponentProps<typeof DataCascade>['tableTitleSlot']>
        >(() => <p data-test-id="table-title">{initData.length} documents</p>, [initData.length]);

        return (
          <div style={{ height: '400px', overflow: 'auto' }}>
            <DataCascade<MockGroupData>
              size="m"
              data={initData}
              cascadeGroups={groupBy}
              tableTitleSlot={tableTitleSlot}
              onCascadeGroupingChange={onCascadeGroupingChange}
            >
              <DataCascadeRow<MockGroupData, any>
                rowHeaderTitleSlot={rowHeaderTitleSlot}
                rowHeaderActions={rowHeaderActions}
                rowHeaderMetaSlots={rowHeaderMetaSlots}
                onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
              >
                <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
                  {({ data: cellData }) => <div data-testid="cell-content">{cellData}</div>}
                </DataCascadeRowCell>
              </DataCascadeRow>
            </DataCascade>
          </div>
        );
      },
      { recordCount: dataRecordCount, groupBy: groupByFields.map(({ field }) => field) }
    )
  );
}

describe('DataCascade', () => {
  describe('ES|QL use case', () => {
    it('renders without crashing', () => {
      renderESQLUseCaseComponent({
        query: 'FROM my_index | STATS count = UNIQUE() BY record.field1, record.field2',
        dataRecordCount: 1000,
        onCascadeGroupingChange: jest.fn(),
        onCascadeLeafNodeExpanded: jest.fn(),
        onCascadeGroupNodeExpanded: jest.fn(),
        rowHeaderTitleSlot: jest.fn(),
        rowHeaderActions: jest.fn(),
        rowHeaderMetaSlots: jest.fn(),
      });

      expect(screen.getByTestId('data-cascade')).toBeInTheDocument();
    });
  });
});
