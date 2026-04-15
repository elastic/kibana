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
  EuiWrappingPopover,
} from '@elastic/eui';
import { faker } from '@faker-js/faker';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { StoryObj } from '@storybook/react';
import React, { type ComponentProps, useMemo, useCallback, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MockGroupData } from '../../__fixtures__/types';
import {
  DataCascade,
  type DataCascadeRowProps,
  type DataCascadeRowCellProps,
  DataCascadeRow,
  DataCascadeRowCell,
  type LeafNode,
} from '../../components';
import { useCustomTableHeader, useRowHeaderTitleSlot } from '../helpers';

/**
 * This story demonstrates a custom header with custom row actions,
 */
export const CascadeCustomHeaderWithCustomRowActionsImplementation: StoryObj<
  { query: string } & Pick<ComponentProps<typeof DataCascade>, 'size'>
> = {
  render: function DataCascadeWrapper(args, context) {
    const groupByFields = useMemo(
      () => getESQLStatsQueryMeta(args.query).groupByFields.map(({ field }) => field),
      [args.query]
    );

    const customerEmailPopoverRef = React.useRef<HTMLElement | null>(null);
    const [alertsCandidates, setAlertsCandidates] = React.useState<string[]>([]);

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
      NonNullable<ComponentProps<typeof DataCascade<MockGroupData>>['onCascadeGroupingChange']>
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
              id="sharedUXPackages.data_cascade.demo.custom_header_with_custom_row_actions.row.count"
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
            tableCaption="custom header with custom row actions table"
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

    const renderSendAlertsPopover = useCallback(() => {
      return Boolean(alertsCandidates?.length) ? (
        <EuiWrappingPopover
          button={customerEmailPopoverRef.current!}
          isOpen={alertsCandidates.length > 0}
          closePopover={() => setAlertsCandidates([])}
          aria-label={i18n.translate(
            'sharedUXPackages.data_cascade.stories.sendAlertsPopoverAriaLabel',
            { defaultMessage: 'Send alerts' }
          )}
        >
          <EuiText>
            <h3>Create an alert for {alertsCandidates.length} recipients</h3>
            <ul>
              {alertsCandidates.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </EuiText>
        </EuiWrappingPopover>
      ) : null;
    }, [alertsCandidates]);

    const sendAlertsActionClickHandler = useCallback(function (
      this: string,
      e: React.MouseEvent<Element>
    ) {
      customerEmailPopoverRef.current = e.currentTarget as HTMLElement;
      setAlertsCandidates([this]);
    },
    []);

    const rowHeaderActions = useCallback<
      NonNullable<DataCascadeRowProps<MockGroupData, LeafNode>['rowHeaderActions']>
    >(
      ({ rowData, nodePath }) => {
        const rowGroup = nodePath[nodePath.length - 1];

        const groupValue = rowData[rowGroup];

        return [
          {
            iconType: 'bell',
            'aria-label': `Create alert for ${groupValue}`,
            onClick: sendAlertsActionClickHandler.bind(String(groupValue)),
            label: (
              <FormattedMessage
                id="sharedUXPackages.data_cascade.demo.custom_header_with_custom_row_actions.row.edit"
                defaultMessage="Create alert"
              />
            ),
          },
        ];
      },
      [sendAlertsActionClickHandler]
    );

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
          <Fragment>{renderSendAlertsPopover()}</Fragment>
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
      description: 'Simulation of The ES|QL query that the user provided into the esql editor',
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

CascadeCustomHeaderWithCustomRowActionsImplementation.parameters = { docs: { disable: true } };
