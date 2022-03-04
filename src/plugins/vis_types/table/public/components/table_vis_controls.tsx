/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { DatatableColumn, DatatableRow } from 'src/plugins/expressions';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../kibana_react/public';
import { exporters } from '../../../../data/public';
import {
  CSV_SEPARATOR_SETTING,
  CSV_QUOTE_VALUES_SETTING,
  downloadFileAs,
} from '../../../../share/public';
import { getFormatService } from '../services';

interface TableVisControlsProps {
  dataGridAriaLabel: string;
  filename?: string;
  columns: DatatableColumn[];
  rows: DatatableRow[];
}

export const TableVisControls = memo(
  ({ dataGridAriaLabel, filename, columns, rows }: TableVisControlsProps) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((state) => !state), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const {
      services: { uiSettings },
    } = useKibana<CoreStart>();

    const detectedFormulasInTable = exporters.tableHasFormulas(columns, rows);

    const onClickExport = useCallback(
      (formatted: boolean) => {
        const csvSeparator = uiSettings.get(CSV_SEPARATOR_SETTING);
        const quoteValues = uiSettings.get(CSV_QUOTE_VALUES_SETTING);

        const content = exporters.datatableToCSV(
          {
            type: 'datatable',
            columns,
            rows,
          },
          {
            csvSeparator,
            quoteValues,
            formatFactory: getFormatService().deserialize,
            raw: !formatted,
            escapeFormulaValues: false,
          }
        );
        downloadFileAs(`${filename || 'unsaved'}.csv`, { content, type: exporters.CSV_MIME_TYPE });
      },
      [columns, rows, filename, uiSettings]
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
        <FormattedMessage
          id="visTypeTable.vis.controls.exportButtonLabel"
          defaultMessage="Export"
        />
      </EuiButtonEmpty>
    );

    const downloadButton = detectedFormulasInTable ? (
      <EuiToolTip
        position="top"
        content={i18n.translate('visTypeTable.vis.controls.exportButtonFormulasWarning', {
          defaultMessage:
            'Your CSV contains characters that spreadsheet applications might interpret as formulas.',
        })}
      >
        {button}
      </EuiToolTip>
    ) : (
      button
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
        button={downloadButton}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiContextMenuPanel className="eui-textNoWrap" items={items} />
      </EuiPopover>
    );
  }
);
