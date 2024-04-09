/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import { TextWithIcon } from '../text_with_icon';
import { TriggerLineItem } from '../trigger_line_item';
import {
  txtCreateDrilldown,
  txtDeleteDrilldowns,
  txtEditDrilldown,
  txtCloneDrilldown,
  txtSelectDrilldown,
  txtName,
  txtAction,
  txtTrigger,
} from './i18n';

export interface DrilldownTableItem {
  id: string;
  actionName: string;
  drilldownName: string;
  icon?: string;
  error?: string;
  triggers?: Trigger[];
  triggerIncompatible?: boolean;
}

interface Trigger {
  title?: string;
  description?: string;
}

export const TEST_SUBJ_DRILLDOWN_ITEM = 'listManageDrilldownsItem';

export interface DrilldownTableProps {
  items: DrilldownTableItem[];
  onCreate?: () => void;
  onDelete?: (ids: string[]) => void;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
}

export const DrilldownTable: React.FC<DrilldownTableProps> = ({
  items: drilldowns,
  onCreate,
  onDelete,
  onEdit,
  onCopy,
}) => {
  const [selectedDrilldowns, setSelectedDrilldowns] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownTableItem>> = [
    {
      field: 'drilldownName',
      name: txtName,
      sortable: true,
      'data-test-subj': 'drilldownListItemName',
      render: (drilldownName: string, drilldown: DrilldownTableItem) => (
        <div>
          {drilldownName}{' '}
          {drilldown.error && (
            <EuiToolTip id={`drilldownError-${drilldown.id}`} content={drilldown.error}>
              <EuiIcon
                type="warning"
                color="danger"
                title={drilldown.error}
                aria-label={drilldown.error}
                data-test-subj={`drilldownError-${drilldown.id}`}
                style={{ marginLeft: '4px' }} /* a bit of spacing from text */
              />
            </EuiToolTip>
          )}
        </div>
      ),
    },
    {
      name: txtAction,
      render: (drilldown: DrilldownTableItem) => (
        <TextWithIcon icon={drilldown.icon} color={'subdued'}>
          {drilldown.actionName}
        </TextWithIcon>
      ),
    },
    {
      field: 'triggers',
      name: txtTrigger,
      textOnly: true,
      sortable: (drilldown: DrilldownTableItem) =>
        drilldown.triggers ? drilldown.triggers[0].title : '',
      render: (triggers: unknown, drilldown: DrilldownTableItem) => {
        if (!drilldown.triggers) return null;
        const trigger = drilldown.triggers[0];
        return (
          <TriggerLineItem
            incompatible={drilldown.triggerIncompatible}
            tooltip={trigger.description}
          >
            {trigger.title ?? 'unknown'}
          </TriggerLineItem>
        );
      },
    },
    {
      align: 'right',
      render: (drilldown: DrilldownTableItem) => (
        <>
          {!!onEdit && (
            <EuiButtonEmpty
              size="xs"
              disabled={!!selectedDrilldowns.length}
              onClick={() => onEdit(drilldown.id)}
            >
              {txtEditDrilldown}
            </EuiButtonEmpty>
          )}
          {!!onCopy && (
            <EuiButtonEmpty
              size="xs"
              disabled={!!selectedDrilldowns.length}
              onClick={() => onCopy(drilldown.id)}
            >
              {txtCloneDrilldown}
            </EuiButtonEmpty>
          )}
        </>
      ),
    },
  ].filter(Boolean) as Array<EuiBasicTableColumn<DrilldownTableItem>>;

  return (
    <>
      <EuiInMemoryTable
        items={drilldowns}
        itemId="id"
        columns={columns}
        isSelectable={true}
        responsiveBreakpoint={false}
        selection={{
          onSelectionChange: (selection) => {
            setSelectedDrilldowns(selection.map((drilldown) => drilldown.id));
          },
          selectableMessage: () => txtSelectDrilldown,
        }}
        rowProps={{
          'data-test-subj': TEST_SUBJ_DRILLDOWN_ITEM,
        }}
        hasActions={true}
        sorting={{
          sort: {
            field: 'drilldownName',
            direction: 'asc',
          },
        }}
      />
      <EuiSpacer />
      {!!onCreate && !selectedDrilldowns.length && (
        <EuiButton fill onClick={() => onCreate()}>
          {txtCreateDrilldown}
        </EuiButton>
      )}
      {!!onDelete && selectedDrilldowns.length > 0 && (
        <EuiButton
          color="danger"
          fill
          onClick={() => onDelete(selectedDrilldowns)}
          data-test-subj={'listManageDeleteDrilldowns'}
        >
          {txtDeleteDrilldowns(selectedDrilldowns.length)}
        </EuiButton>
      )}
    </>
  );
};
