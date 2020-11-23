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

import { i18n } from '@kbn/i18n';
import { FormatFactory } from '../../../../data/common/field_formats/utils';
import { DataPublicPluginStart, exportAsCSVs } from '../../../../data/public';
import { downloadMultipleAs } from '../../../../share/public';
import { Adapters, IEmbeddable } from '../../../../embeddable/public';
import { ActionByType } from '../../../../ui_actions/public';
import { CoreStart } from '../../../../../core/public';

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
export class ExportCSVAction implements ActionByType<typeof ACTION_EXPORT_CSV> {
  public readonly id = ACTION_EXPORT_CSV;

  public readonly type = ACTION_EXPORT_CSV;

  public readonly order = 200;

  constructor(protected readonly params: Params) {}

  public getIconType() {
    return 'exportAction';
  }

  public readonly getDisplayName = (context: ExportContext): string =>
    i18n.translate('xpack.lens.DownloadCreateDrilldownAction.displayName', {
      defaultMessage: 'Download as CSV',
    });

  public async isCompatible(context: ExportContext): Promise<boolean> {
    return Boolean(
      context.embeddable &&
        'getInspectorAdapters' in context.embeddable &&
        this.hasDatatableContent(context.embeddable.getInspectorAdapters())
    );
  }

  private hasDatatableContent = (adapters: Adapters | undefined) => {
    return adapters && (adapters.data || adapters[Object.keys(adapters)[0]]?.columns);
  };

  private getFormatter = (
    type: string | undefined,
    adapters: Adapters | undefined
  ): FormatFactory | undefined => {
    if (type === 'lens') {
      return this.params.data.fieldFormats.deserialize;
    }

    if (type === 'visualization') {
      return (() => ({
        convert: (item: { raw: string; formatted: string }) => item.formatted,
      })) as FormatFactory;
    }

    if (this.hasDatatableContent(adapters)) {
      // if of unknown type, return an identity
      return (() => ({
        convert: (item) => item,
      })) as FormatFactory;
    }
  };

  private getDataTableContent = async (
    type: string | undefined,
    adapters: Adapters | undefined
  ) => {
    if (!adapters || !type) {
      return;
    }
    // Visualize
    if (type === 'visualization') {
      const datatable = await adapters.data.tabular();
      datatable.columns = datatable.columns.map(({ field, ...rest }: { field: string }) => ({
        id: field,
        field,
        ...rest,
      }));
      return { layer1: datatable };
    }
    // Lens
    if (type === 'lens') {
      return adapters;
    }

    // Make a last attempt to duck type the adapter (useful for testing)
    if (this.hasDatatableContent(adapters)) {
      return adapters;
    }
    return;
  };

  private exportCSV = async (context: ExportContext) => {
    const formatFactory = this.getFormatter(
      context?.embeddable?.type,
      context?.embeddable?.getInspectorAdapters()
    );
    // early exit if not formatter is available
    if (!formatFactory) {
      return;
    }
    const datatables = await this.getDataTableContent(
      context?.embeddable?.type,
      context?.embeddable?.getInspectorAdapters()
    );

    if (datatables) {
      const content = exportAsCSVs(context?.embeddable?.getTitle()!, datatables, {
        csvSeparator: this.params.core.uiSettings.get('csv:separator', ','),
        quoteValues: this.params.core.uiSettings.get('csv:quoteValues', true),
        formatFactory,
      });
      if (content) {
        return downloadMultipleAs(content);
      }
    }
  };

  public async execute(context: ExportContext): Promise<void> {
    // make it testable: type here will be forced
    return ((await this.exportCSV(context)) as unknown) as Promise<void>;
  }
}
