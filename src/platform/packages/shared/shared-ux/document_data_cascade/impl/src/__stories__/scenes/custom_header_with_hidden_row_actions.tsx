/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiStat,
  EuiHealth,
  EuiBasicTable,
  type HorizontalAlignment,
} from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { StoryObj } from '@storybook/react';
import React, { type ComponentProps, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MockGroupData } from '../../__fixtures__/types';
import {
  DataCascade,
  type DataCascadeProps,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
  DataCascadeRow,
  DataCascadeRowCell,
} from '../../components';
import type { LeafNode } from '../../store_provider';
import { useCustomTableHeader, useRowHeaderTitleSlot } from '../helpers';

/**
 * This story demonstrates a custom header with hidden row actions,
 */
export const CascadeCustomHeaderWithHiddenRowActions: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  render: function DataCascadeWrapper(args, context) {
    const groupByFields = useMemo(
      () => getESQLStatsQueryMeta(args.query).groupByFields.map(({ field }) => field),
      [args.query]
    );

    const generateGroupFieldRecord = useCallback(
      (nodePath?: string[], nodePathMap?: Record<string, string>) => {
        return groupByFields.reduce<Record<string, string>>((acc, field) => {
          return {
            ...acc,
            [field]:
              nodePathMap && nodePath?.indexOf(field) !== -1
                ? nodePathMap[field]
                : /clientip/.test(field)
                ? faker.internet.ipv4()
                : /url\.keyword/.test(field)
                ? faker.internet.url({ protocol: 'https' })
                : faker.person.fullName(),
          };
        }, {} as Record<string, string>);
      },
      [groupByFields]
    );

    const initData: MockGroupData[] = useMemo(
      () =>
        new Array(100).fill(null).map(() => {
          return {
            id: faker.string.uuid(),
            count: faker.number.int({ min: 1, max: 100 }),
            customer_email: faker.internet.email(),
            ...generateGroupFieldRecord(),
          };
        }),
      [generateGroupFieldRecord]
    );

    const customTableHeader = useCustomTableHeader({
      headerTitle: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="securitySignal" size="xl" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText>
              <h2>Security alerts</h2>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    });

    const rowHeaderTitleSlot = useRowHeaderTitleSlot();

    const onCascadeGroupingChange = useCallback<
      NonNullable<DataCascadeProps<MockGroupData, LeafNode>['onCascadeGroupingChange']>
    >((groupBy) => {
      // eslint-disable-next-line no-console -- Handle group by change if needed
      console.log('Group By Changed:', groupBy);
    }, []);

    const onCascadeGroupNodeExpanded = useCallback<
      DataCascadeRowProps<MockGroupData, LeafNode>['onCascadeGroupNodeExpanded']
    >(
      async ({ row, nodePath, nodePathMap }) => {
        // Simulate a data fetch on row expansion
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              new Array(row.count).fill(null).map(() => {
                return {
                  id: faker.string.uuid(),
                  count: faker.number.int({ min: 1, max: row.count }),
                  ...generateGroupFieldRecord(nodePath, nodePathMap),
                };
              })
            );
          }, 3000);
        });
      },
      [generateGroupFieldRecord]
    );

    const rowHeaderMetaSlots = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderMetaSlots']>
    >(({ rowData }) => {
      return [
        <EuiStat
          reverse
          title={rowData.count}
          textAlign="right"
          description={
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.custom_header_with_hidden_row_actions.row.count"
              defaultMessage="<indicator>record count</indicator>"
              values={{
                indicator: (chunks) => <EuiHealth color="subdued">{chunks}</EuiHealth>,
              }}
            />
          }
        />,
      ];
    }, []);

    const onCascadeLeafNodeExpanded = useCallback<
      DataCascadeRowCellProps<MockGroupData, LeafNode>['onCascadeLeafNodeExpanded']
    >(
      async ({ row, nodePathMap, nodePath }) => {
        // Simulate a data fetch for the expanded leaf,
        // ideally we'd want to use nodePath information to fetch this data
        return new Promise<LeafNode[]>((resolve) => {
          setTimeout(() => {
            resolve(
              new Array(row.count).fill(null).map(() => {
                return {
                  id: faker.string.uuid(),
                  ...generateGroupFieldRecord(nodePath, nodePathMap),
                };
              })
            );
          }, 3000);
        });
      },
      [generateGroupFieldRecord]
    );

    const cascadeLeafCellRenderer = useCallback<
      DataCascadeRowCellProps<MockGroupData, LeafNode>['children']
    >(
      ({ data }) => {
        return (
          <EuiBasicTable
            tableCaption="custom header with hidden row actions table"
            columns={[
              {
                field: 'id',
                name: 'ID',
              },
              ...groupByFields.map((field, index, groupArray) => ({
                field,
                name: field.replace(/_/g, ' '),
                ...(index === groupArray.length - 1
                  ? { align: 'right' as HorizontalAlignment }
                  : {}),
              })),
            ]}
            items={(data ?? []).map((datum) => ({
              id: datum.id,
              ...groupByFields.reduce(
                (acc, field) => ({
                  ...acc,
                  [field]: datum[field],
                }),
                {} as Record<string, string>
              ),
            }))}
          />
        );
      },
      [groupByFields]
    );

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];

      const groupValue = rowData[rowGroup];

      return [
        {
          iconType: 'starEmpty',
          'aria-label': `favorite ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for favorite */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.custom_header_with_hidden_row_actions.row.favorite"
              defaultMessage="Favorite"
            />
          ),
        },
        {
          iconType: 'flag',
          'aria-label': `flag ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for flagging */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.custom_header_with_hidden_row_actions.row.flag"
              defaultMessage="Flag"
            />
          ),
        },
        {
          iconType: 'bell',
          'aria-label': `Create alert for ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for create alerts */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.custom_header_with_hidden_row_actions.row.create_alerts"
              defaultMessage="Create alerts"
            />
          ),
        },
        {
          iconType: 'download',
          'aria-label': `Download records of ${groupValue}`,
          onClick: () => {
            /** Noop Click handler for download */
          },
          label: (
            <FormattedMessage
              id="sharedUXPackages.data_cascade.demo.custom_header_with_hidden_row_actions.row.download"
              defaultMessage="Download"
            />
          ),
        },
      ];
    }, []);

    return (
      <EuiFlexGroup direction="column" css={{ height: 'calc(100svh - 2rem)' }}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <div>
              <h3>{context.name}</h3>
            </div>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <DataCascade
            size={args.size}
            data={initData}
            cascadeGroups={groupByFields}
            customTableHeader={customTableHeader}
            onCascadeGroupingChange={onCascadeGroupingChange}
          >
            <DataCascadeRow<MockGroupData, LeafNode>
              onCascadeGroupNodeExpanded={onCascadeGroupNodeExpanded}
              rowHeaderTitleSlot={rowHeaderTitleSlot}
              rowHeaderMetaSlots={rowHeaderMetaSlots}
              rowHeaderActions={rowHeaderActions}
            >
              <DataCascadeRowCell onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}>
                {cascadeLeafCellRenderer}
              </DataCascadeRowCell>
            </DataCascadeRow>
          </DataCascade>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  argTypes: {
    query: {
      type: 'string' as const,
      description:
        'Simulation of The ES|QL query that the user provided into the esql editor, used to generate group by fields used to generate group by fields used to generate group by fields',
    },
    size: {
      name: 'Size',
      control: 'radio',
      options: ['s', 'm', 'l'],
      description: 'Size of the cascade rows',
    },
  },
  args: {
    query: 'FROM kibana_sample_data_logs | STATS count = COUNT() BY clientip, url.keyword',
    size: 'm',
  },
};

CascadeCustomHeaderWithHiddenRowActions.parameters = { docs: { disable: true } };
