/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import {
  DataCascade,
  DataCascadeRow,
  DataCascadeRowCell,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
} from '.';
import { getESQLStatsQueryMeta } from '../lib/parse_esql';
import type { MockGroupData } from '../__fixtures__/types';

interface RenderComponentProps
  extends Pick<ComponentProps<typeof DataCascade>, 'onCascadeGroupingChange'>,
    Omit<DataCascadeRowProps<MockGroupData, any>, 'children'>,
    Omit<DataCascadeRowCellProps<MockGroupData, any>, 'children'> {
  query: string;
  dataRecordCount: number;
}

const generateGroupRecord = (
  groupByFields: ReturnType<typeof getESQLStatsQueryMeta>['groupByFields'],
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

  const initData: MockGroupData[] = new Array(dataRecordCount).fill(null).map(() => {
    return {
      id: faker.string.uuid(),
      count: faker.number.int({ min: 1, max: 100 }),
      ...generateGroupRecord(groupByFields),
    };
  });

  render(
    <div style={{ height: '400px', overflow: 'auto' }}>
      <DataCascade<MockGroupData>
        size="m"
        data={initData}
        cascadeGroups={groupByFields}
        tableTitleSlot={({ rows }) => <p data-test-id="table-title">{rows.length} documents</p>}
        onCascadeGroupingChange={onCascadeGroupingChange}
      >
        <DataCascadeRow<MockGroupData>
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
