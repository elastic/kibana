/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { exporters } from '@kbn/data-plugin/public';
import type { TableInspectorAdapter } from '@kbn/lens-plugin/public/editor_frame_service/types';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { downloadMultipleAs } from './download_as';

declare global {
  interface Window {
    /**
     * Debug setting to test CSV download
     */
    ELASTIC_LENS_CSV_DOWNLOAD_DEBUG?: boolean;
    ELASTIC_LENS_CSV_CONTENT?: Record<string, { content: string; type: string }>;
  }
}

export async function downloadCSVs({
  activeData,
  title,
  formatFactory,
  uiSettings,
  columnsSorting,
}: {
  title: string;
  activeData: TableInspectorAdapter;
  formatFactory: FormatFactory;
  uiSettings: IUiSettingsClient;
  columnsSorting?: string[];
}) {
  if (!activeData) {
    if (window.ELASTIC_LENS_CSV_DOWNLOAD_DEBUG) {
      window.ELASTIC_LENS_CSV_CONTENT = undefined;
    }
    return;
  }
  const datatables = Object.values(activeData);
  const content = datatables.reduce<Record<string, { content: string; type: string }>>(
    (memo, datatable, i) => {
      // skip empty datatables
      if (datatable) {
        const postFix = datatables.length > 1 ? `-${i + 1}` : '';

        memo[`${title}${postFix}.csv`] = {
          content: exporters.datatableToCSV(datatable, {
            csvSeparator: uiSettings.get('csv:separator', ','),
            quoteValues: uiSettings.get('csv:quoteValues', true),
            formatFactory,
            escapeFormulaValues: false,
            columnsSorting,
          }),
          type: exporters.CSV_MIME_TYPE,
        };
      }
      return memo;
    },
    {}
  );
  if (window.ELASTIC_LENS_CSV_DOWNLOAD_DEBUG) {
    window.ELASTIC_LENS_CSV_CONTENT = content;
  }
  if (content) {
    downloadMultipleAs(content);
  }
}
