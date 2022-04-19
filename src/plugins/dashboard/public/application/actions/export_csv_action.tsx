/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { FormatFactory } from '@kbn/field-formats-plugin/common';

import { DataPublicPluginStart, exporters } from '../../services/data';
import { downloadMultipleAs } from '../../services/share';
import { Adapters, IEmbeddable } from '../../services/embeddable';
import { Action } from '../../services/ui_actions';
import { dashboardExportCsvAction } from '../../dashboard_strings';

export const ACTION_EXPORT_CSV = 'ACTION_EXPORT_CSV';

export interface Params {
  core: CoreStart;
  data: DataPublicPluginStart;
}

export interface ExportContext {
  embeddable?: IEmbeddable;
  // used for testing
  asString?: boolean;
}

/**
 * This is "Export CSV" action which appears in the context
 * menu of a dashboard panel.
 */
export class ExportCSVAction implements Action<ExportContext> {
  public readonly id = ACTION_EXPORT_CSV;

  public readonly type = ACTION_EXPORT_CSV;

  public readonly order = 5;

  constructor(protected readonly params: Params) {}

  public getIconType() {
    return 'exportAction';
  }

  public readonly getDisplayName = (context: ExportContext): string =>
    dashboardExportCsvAction.getDisplayName();

  public async isCompatible(context: ExportContext): Promise<boolean> {
    return !!this.hasDatatableContent(context.embeddable?.getInspectorAdapters?.());
  }

  private hasDatatableContent = (adapters: Adapters | undefined) => {
    return Object.keys(adapters?.tables || {}).length > 0 && adapters!.tables.allowCsvExport;
  };

  private getFormatter = (): FormatFactory | undefined => {
    if (this.params.data) {
      return this.params.data.fieldFormats.deserialize;
    }
  };

  private getDataTableContent = (adapters: Adapters | undefined) => {
    if (this.hasDatatableContent(adapters)) {
      return adapters?.tables.tables;
    }
    return;
  };

  private exportCSV = async (context: ExportContext) => {
    const formatFactory = this.getFormatter();
    // early exit if not formatter is available
    if (!formatFactory) {
      return;
    }
    const tableAdapters = this.getDataTableContent(
      context?.embeddable?.getInspectorAdapters()
    ) as Record<string, Datatable>;

    if (tableAdapters) {
      const datatables = Object.values(tableAdapters);
      const content = datatables.reduce<Record<string, { content: string; type: string }>>(
        (memo, datatable, i) => {
          // skip empty datatables
          if (datatable) {
            const postFix = datatables.length > 1 ? `-${i + 1}` : '';
            const untitledFilename = dashboardExportCsvAction.getUntitledFilename();

            memo[`${context!.embeddable!.getTitle() || untitledFilename}${postFix}.csv`] = {
              content: exporters.datatableToCSV(datatable, {
                csvSeparator: this.params.core.uiSettings.get('csv:separator', ','),
                quoteValues: this.params.core.uiSettings.get('csv:quoteValues', true),
                formatFactory,
                escapeFormulaValues: false,
              }),
              type: exporters.CSV_MIME_TYPE,
            };
          }
          return memo;
        },
        {}
      );

      // useful for testing
      if (context.asString) {
        return content as unknown as Promise<void>;
      }

      if (content) {
        return downloadMultipleAs(content);
      }
    }
  };

  public async execute(context: ExportContext): Promise<void> {
    // make it testable: type here will be forced
    return await this.exportCSV(context);
  }
}
