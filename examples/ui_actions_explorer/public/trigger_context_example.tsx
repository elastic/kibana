/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment, useMemo, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiDataGrid } from '@elastic/eui';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { USER_TRIGGER, PHONE_TRIGGER, COUNTRY_TRIGGER, User } from './actions/actions';

export interface Props {
  uiActionsApi: UiActionsStart;
}

interface UserRowData {
  name: string;
  countryOfResidence: React.ReactNode;
  phone: React.ReactNode;
  rowActions: React.ReactNode;
  [key: string]: any;
}

const createRowData = (
  user: User,
  uiActionsApi: UiActionsStart,
  update: (newUser: User, oldName: string) => void
) => ({
  name: user.name,
  countryOfResidence: (
    <Fragment>
      <EuiButtonEmpty
        onClick={() => {
          uiActionsApi.executeTriggerActions(COUNTRY_TRIGGER, {
            country: user.countryOfResidence,
          });
        }}
      >
        {user.countryOfResidence}
      </EuiButtonEmpty>
    </Fragment>
  ),
  phone: (
    <Fragment>
      <EuiButtonEmpty
        onClick={() => {
          uiActionsApi.executeTriggerActions(PHONE_TRIGGER, {
            phone: user.phone,
          });
        }}
      >
        {user.phone}
      </EuiButtonEmpty>
    </Fragment>
  ),
  rowActions: (
    <Fragment>
      <EuiButtonEmpty
        onClick={() => {
          uiActionsApi.executeTriggerActions(USER_TRIGGER, {
            user,
            update: (newUser: User) => update(newUser, user.name),
          });
        }}
      >
        Actions
      </EuiButtonEmpty>
    </Fragment>
  ),
});

export function TriggerContextExample({ uiActionsApi }: Props) {
  const columns = [
    {
      id: 'name',
    },
    {
      id: 'countryOfResidence',
    },
    {
      id: 'phone',
    },
    {
      id: 'rowActions',
    },
  ];

  const rawData = [
    { name: 'Sue', countryOfResidence: 'USA', phone: '1-519-555-1234' },
    { name: 'Bob', countryOfResidence: 'Germany' },
    { name: 'Tom', countryOfResidence: 'Russia', phone: '45-555-444-1234' },
  ];

  const updateUser = (newUser: User, oldName: string) => {
    const index = rows.findIndex(u => u.name === oldName);
    const newRows = [...rows];
    newRows.splice(index, 1, createRowData(newUser, uiActionsApi, updateUser));
    setRows(newRows);
  };

  const initialRows: UserRowData[] = rawData.map((user: User) =>
    createRowData(user, uiActionsApi, updateUser)
  );

  const [rows, setRows] = useState(initialRows);

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      return rows.hasOwnProperty(rowIndex) ? rows[rowIndex][columnId] : null;
    };
  }, [rows]);

  return (
    <EuiText>
      <h1>Triggers that emit context</h1>
      <p>
        The trigger above did not emit any context, but a trigger can, and if it does, it will be
        passed to the action when it is executed. This is helpful for dynamic data that is only
        known at the time the trigger is emitted. Lets explore a use case where the is dynamic. The
        following data grid emits a few triggers, each with a some actions attached.
      </p>

      <EuiDataGrid
        aria-label="Action and trigger data demo"
        columns={columns}
        renderCellValue={renderCellValue}
        rowCount={rawData.length}
        columnVisibility={{
          visibleColumns: ['name', 'phone', 'countryOfResidence', 'rowActions'],
          setVisibleColumns: () => {},
        }}
      />
    </EuiText>
  );
}
