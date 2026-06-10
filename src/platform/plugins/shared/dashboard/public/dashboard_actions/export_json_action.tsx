/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { exporters } from '@kbn/data-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import { downloadMultipleAs } from '@kbn/share-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';

import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import { apiHasInspectorAdapters, type Adapters } from '@kbn/inspector-plugin/public';
import type { EmbeddableApiContext, HasType, PublishesTitle } from '@kbn/presentation-publishing';
import { apiHasType, getTitle } from '@kbn/presentation-publishing';
import { coreServices, fieldFormatService, shareService } from '../services/kibana_services';
import { dashboardExportCsvActionStrings } from './_dashboard_actions_strings';
import { ACTION_EXPORT_CSV, ACTION_EXPORT_JSON } from './constants';
import type { ShareActionIntents } from '../../../share/public/types';

export type ExportJSONActionApi = HasType;

const isApiCompatible = (api: unknown | null): api is ExportJSONActionApi =>
  Boolean(apiHasType(api));

export class ExportJSONAction implements Action<EmbeddableApiContext> {
  public readonly id = ACTION_EXPORT_JSON;
  public readonly type = ACTION_EXPORT_JSON;
  public readonly order = 18;
  public grouping = [
    {
      id: 'export_actions',
      order: 100,
      asContextMenu: true,
      getIconType: () => 'upload',
      getDisplayName: () =>
        i18n.translate('dashboard.actions.exportDisplayName', {
          defaultMessage: 'Export',
        }),
    },
  ];

  public getIconType() {
    return 'code';
  }

  public readonly getDisplayName = (context: EmbeddableApiContext): string =>
    i18n.translate('dashboard.actions.exportJsonDisplayName', {
      defaultMessage: 'Export JSON',
    });

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    if (!isApiCompatible(embeddable)) return false;
    const exportDerivatives: ShareActionIntents[] =
      shareService?.availableIntegrations(embeddable.type, 'exportDerivatives') ?? [];
    return (
      exportDerivatives.filter(
        (element) => element.shareType === 'integration' && element.id === 'exportJson'
      ).length > 0
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    // return await this.exportCSV(embeddable, asString);
  }
}
