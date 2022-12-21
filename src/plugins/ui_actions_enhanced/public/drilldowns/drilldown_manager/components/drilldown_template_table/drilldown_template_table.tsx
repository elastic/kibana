/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiSpacer,
  EuiButton,
  EuiText,
  EuiSearchBarProps,
} from '@elastic/eui';
import {
  txtNameColumnTitle,
  txtSelectableMessage,
  txtCopyButtonLabel,
  txtSingleItemCopyActionLabel,
  txtActionColumnTitle,
  txtTriggerColumnTitle,
} from './i18n';
import { TextWithIcon } from '../text_with_icon';
import { TriggerLineItem } from '../trigger_line_item';

export interface DrilldownTemplateTableItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  actionName?: string;
  actionIcon?: string;
  trigger?: string;
  triggerIncompatible?: boolean;
}

export interface DrilldownTemplateTableProps {
  items: DrilldownTemplateTableItem[];
  onCreate?: (id: string) => void;
  onClone?: (ids: string[]) => void;
}

export const DrilldownTemplateTable: React.FC<DrilldownTemplateTableProps> = ({
  items,
  onCreate,
  onClone,
}) => {
  const [selected, setSelected] = useState<string[]>([]);

  const columns: Array<EuiBasicTableColumn<DrilldownTemplateTableItem>> = [
    {
      field: 'name',
      name: txtNameColumnTitle,
      sortable: true,
      render: (omit, item: DrilldownTemplateTableItem) => (
        <div style={{ display: 'block' }}>
          <div style={{ display: 'block' }}>{item.name}</div>
          <EuiText size={'xs'} color={'subdued'}>
            {item.description}
          </EuiText>
        </div>
      ),
    },
    {
      name: txtActionColumnTitle,
      render: (item: DrilldownTemplateTableItem) => (
        <TextWithIcon icon={item.actionIcon || 'empty'} color={'subdued'}>
          {item.actionName}
        </TextWithIcon>
      ),
    },
    {
      field: 'trigger',
      name: txtTriggerColumnTitle,
      sortable: true,
      render: (omit, item: DrilldownTemplateTableItem) => (
        <TriggerLineItem incompatible={item.triggerIncompatible}>{item.trigger}</TriggerLineItem>
      ),
    },
    {
      align: 'right',
      render: (drilldown: DrilldownTemplateTableItem) =>
        !!onCreate && (
          <EuiButtonEmpty
            size="xs"
            disabled={!!selected.length}
            onClick={() => onCreate(drilldown.id)}
          >
            {txtSingleItemCopyActionLabel}
          </EuiButtonEmpty>
        ),
    },
  ];

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
    },
    defaultQuery: '',
  };

  return (
    <>
      <EuiInMemoryTable
        itemId="id"
        tableLayout={'auto'}
        items={items}
        columns={columns}
        isSelectable={!!onClone}
        responsive={false}
        search={search}
        sorting={{
          sort: {
            field: 'nameCol',
            direction: 'asc',
          },
        }}
        selection={{
          onSelectionChange: (selection) => {
            setSelected(selection.map((drilldown) => drilldown.id));
          },
          selectableMessage: () => txtSelectableMessage,
        }}
        hasActions={true}
      />
      <EuiSpacer />
      {!!onClone && !!selected.length && (
        <EuiButton fill onClick={() => onClone(selected)}>
          {txtCopyButtonLabel(selected.length)}
        </EuiButton>
      )}
    </>
  );
};
