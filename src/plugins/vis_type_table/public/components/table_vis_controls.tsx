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

import React, { memo, useState, useCallback } from 'react';
import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { DatatableRow } from 'src/plugins/expressions';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../kibana_react/public';
import { FormattedColumn } from '../types';
import { Table } from '../table_vis_response_handler';
import { exportAsCsv } from '../utils';

interface TableVisControlsProps {
  filename?: string;
  cols: FormattedColumn[];
  rows: DatatableRow[];
  table: Table;
}

export const TableVisControls = memo((props: TableVisControlsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((state) => !state), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const {
    services: { uiSettings },
  } = useKibana<CoreStart>();

  const onClickExport = useCallback(
    (formatted: boolean) =>
      exportAsCsv(formatted, {
        ...props,
        uiSettings,
      }),
    [props, uiSettings]
  );

  const button = (
    <EuiButtonEmpty
      size="xs"
      iconType="exportAction"
      color="text"
      className="euiDataGrid__controlBtn"
      onClick={togglePopover}
    >
      <FormattedMessage id="visTypeTable.vis.controls.exportButtonLabel" defaultMessage="Export" />
    </EuiButtonEmpty>
  );

  const items = [
    <EuiContextMenuItem key="rawCsv" onClick={() => onClickExport(false)}>
      <FormattedMessage id="visTypeTable.vis.controls.rawCSVButtonLabel" defaultMessage="Raw" />
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="csv" onClick={() => onClickExport(true)}>
      <FormattedMessage
        id="visTypeTable.vis.controls.formattedCSVButtonLabel"
        defaultMessage="Formatted"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="dataTableExportData"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiContextMenuPanel className="eui-textNoWrap" items={items} />
    </EuiPopover>
  );
});
