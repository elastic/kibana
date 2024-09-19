/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { exporters } from '@kbn/data-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/public';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { downloadMultipleAs } from '@kbn/share-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import {
  HasInspectorAdapters,
  apiHasInspectorAdapters,
  type Adapters,
} from '@kbn/inspector-plugin/public';
import {
  EmbeddableApiContext,
  PublishesPanelTitle,
  getPanelTitle,
} from '@kbn/presentation-publishing';
import { coreServices, fieldFormatService } from '../services/kibana_services';
import { dashboardExportCsvActionStrings } from './_dashboard_actions_strings';

export const ACTION_EXPORT_CSV = 'ACTION_EXPORT_CSV';

export type ExportContext = EmbeddableApiContext & {
  // used for testing
  asString?: boolean;
};

export type ExportCsvActionApi = HasInspectorAdapters & Partial<PublishesPanelTitle>;

const isApiCompatible = (api: unknown | null): api is ExportCsvActionApi =>
  Boolean(apiHasInspectorAdapters(api));

export class ExportCSVAction implements Action<ExportContext> {
  public readonly id = ACTION_EXPORT_CSV;
  public readonly type = ACTION_EXPORT_CSV;
  public readonly order = 18; // right after Export in discover which is 19

  constructor() {}

  public getIconType() {
    return 'exportAction';
  }

  public readonly getDisplayName = (context: ExportContext): string =>
    dashboardExportCsvActionStrings.getDisplayName();

  public async isCompatible({ embeddable }: ExportContext): Promise<boolean> {
    if (!isApiCompatible(embeddable)) return false;
    return Boolean(this.hasDatatableContent(embeddable?.getInspectorAdapters?.()));
  }

  private hasDatatableContent = (adapters: Adapters | undefined) => {
    return Object.keys(adapters?.tables || {}).length > 0 && adapters!.tables.allowCsvExport;
  };

  private getFormatter = (): FormatFactory | undefined => {
    return fieldFormatService.deserialize;
  };

  private getDataTableContent = (adapters: Adapters | undefined) => {
    if (this.hasDatatableContent(adapters)) {
      return adapters?.tables.tables;
    }
    return;
  };

  private exportCSV = async (embeddable: ExportCsvActionApi, asString = false) => {
    const formatFactory = this.getFormatter();
    // early exit if not formatter is available
    if (!formatFactory) {
      return;
    }

    const tableAdapters = this.getDataTableContent(embeddable?.getInspectorAdapters()) as Record<
      string,
      Datatable
    >;

    if (tableAdapters) {
      const datatables = Object.values(tableAdapters);
      const content = datatables.reduce<Record<string, { content: string; type: string }>>(
        (memo, datatable, i) => {
          // skip empty datatables
          if (datatable) {
            const postFix = datatables.length > 1 ? `-${i + 1}` : '';
            const untitledFilename = dashboardExportCsvActionStrings.getUntitledFilename();

            memo[`${getPanelTitle(embeddable) || untitledFilename}${postFix}.csv`] = {
              content: exporters.datatableToCSV(datatable, {
                csvSeparator: coreServices.uiSettings.get('csv:separator', ','),
                quoteValues: coreServices.uiSettings.get('csv:quoteValues', true),
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
      if (asString) {
        return content as unknown as Promise<void>;
      }

      if (content) {
        return downloadMultipleAs(content);
      }
    }
  };

  public async execute({ embeddable, asString }: ExportContext): Promise<void> {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return await this.exportCSV(embeddable, asString);
  }
}
