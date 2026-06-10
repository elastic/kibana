/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import type {
  EmbeddableApiContext,
  HasLibraryTransforms,
  HasType,
  HasTypeDisplayName,
  HasUniqueId,
  PublishesTitle,
} from '@kbn/presentation-publishing';
import {
  apiHasLibraryTransforms,
  apiHasType,
  apiHasUniqueId,
  apiPublishesTitle,
  apiPublishesUnsavedChanges,
} from '@kbn/presentation-publishing';
import type { ShareActionIntents, ShareIntegration } from '@kbn/share-plugin/public/types';
import { shareService } from '../services/kibana_services';
import { ACTION_EXPORT_JSON } from './constants';
import { getLocatorParams } from '../../../../../../../x-pack/platform/plugins/shared/lens/public/app_plugin/share_action';

export type ExportJSONActionApi = HasLibraryTransforms &
  HasUniqueId &
  HasType &
  PublishesTitle &
  Partial<HasTypeDisplayName>;

const isApiCompatible = (api: unknown | null): api is ExportJSONActionApi =>
  Boolean(
    apiHasLibraryTransforms(api) && apiHasUniqueId(api) && apiHasType(api) && apiPublishesTitle(api)
  );

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
  private exportJsonIntent: ShareIntegration | undefined;

  public getIconType() {
    return 'code';
  }

  public readonly getDisplayName = (context: EmbeddableApiContext): string =>
    i18n.translate('dashboard.actions.exportJsonDisplayName', {
      defaultMessage: 'Export JSON',
    });

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    if (!isApiCompatible(embeddable) || !(await embeddable.canUnlinkFromLibrary())) return false;

    const exportDerivatives: ShareActionIntents[] = (
      shareService?.availableIntegrations(embeddable.type, 'exportDerivatives') ?? []
    ).filter((element) => element.shareType === 'integration' && element.id === 'exportJson');
    if (exportDerivatives.length < 1) return false;

    this.exportJsonIntent = exportDerivatives[0] as ShareIntegration;
    return true;
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isApiCompatible(embeddable) || !this.exportJsonIntent) throw new IncompatibleActionError();
    console.log({ test: this.exportJsonIntent });

    const baseOptions = {
      objectType: embeddable.type,
      objectId: embeddable.uuid,
      isDirty: apiPublishesUnsavedChanges(embeddable) && embeddable.hasUnsavedChanges$.value,
      allowShortUrl: false,
      objectTypeMeta: {
        title: i18n.translate('dashboard.share.shareModal.title', {
          defaultMessage: `Share ${embeddable.getTypeDisplayName?.() ?? embeddable.type}`,
        }),
        config: {},
      },
      sharingData: {
        title: embeddable.title$.value ?? '',
        locatorParams: { id: '', params: {} },
        exportJson: () => {
          const state = embeddable.getSerializedStateByReference(embeddable.uuid).attributes;
          // const state = embeddable.getSerializedStateByReference().attributes;
          return state;
        },
      },
    };

    const handler = await shareService?.getExportDerivativeHandler(
      baseOptions,
      this.exportJsonIntent.id
    );
    await handler?.();
  }
}
