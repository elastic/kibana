/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { memo, useState, useCallback } from 'react';
import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { Datatable, DatatableRow } from 'src/plugins/expressions';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../kibana_react/public';
import { exporters } from '../../../data/public';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../../../share/public';

import { FormattedColumn } from '../types';
import { exportAsCsv } from '../utils';
import { getFormatService } from '../services';

interface TableVisControlsProps {
  dataGridAriaLabel: string;
  filename?: string;
  cols: FormattedColumn[];
  rows: DatatableRow[];
  table: Datatable;
}

export const TableVisControls = memo(({ dataGridAriaLabel, ...props }: TableVisControlsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((state) => !state), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const {
    services: { uiSettings },
  } = useKibana<CoreStart>();

  const onClickExport = useCallback(
    (formatted: boolean) => {
      const csvSeparator = uiSettings.get(CSV_SEPARATOR_SETTING);
      const quoteValues = uiSettings.get(CSV_QUOTE_VALUES_SETTING);

      // exporters.datatableToCSV(
      //   {
      //     columns: props.cols,
      //     rows: props.rows,
      //   },
      //   {
      //     csvSeparator,
      //     quoteValues,
      //     formatFactory: getFormatService().deserialize,
      //     raw: !formatted,
      //   }
      // );
      exportAsCsv(formatted, {
        ...props,
        uiSettings,
      });
    },
    [props, uiSettings]
  );

  const exportBtnAriaLabel = i18n.translate('visTypeTable.vis.controls.exportButtonAriaLabel', {
    defaultMessage: 'Export {dataGridAriaLabel} as CSV',
    values: {
      dataGridAriaLabel,
    },
  });

  const button = (
    <EuiButtonEmpty
      aria-label={exportBtnAriaLabel}
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
