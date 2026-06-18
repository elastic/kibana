/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  EmbeddableApiContext,
  HasLibraryTransforms,
  HasSerializableState,
  HasType,
  HasTypeDisplayName,
  HasUniqueId,
  PublishesTitle,
} from '@kbn/presentation-publishing';
import {
  apiHasLibraryTransforms,
  apiHasSerializableState,
  apiHasType,
  apiHasUniqueId,
  apiPublishesTitle,
} from '@kbn/presentation-publishing';
import type { ShareActionIntents, ShareIntegration } from '@kbn/share-plugin/public/types';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { EXPORT_ACTION_GROUP } from '@kbn/embeddable-plugin/public';

import { shareService } from '../services/kibana_services';
import { ACTION_EXPORT_JSON } from './constants';

export type ExportJSONActionApi = HasLibraryTransforms &
  HasUniqueId &
  HasType &
  PublishesTitle &
  Partial<HasTypeDisplayName> &
  HasSerializableState;

const isApiCompatible = (api: unknown | null): api is ExportJSONActionApi =>
  Boolean(
    apiHasUniqueId(api) && apiHasType(api) && apiPublishesTitle(api) && apiHasSerializableState(api)
  );

export class ExportJSONAction implements Action<EmbeddableApiContext> {
  public readonly id = ACTION_EXPORT_JSON;
  public readonly type = ACTION_EXPORT_JSON;
  public readonly order = 1;
  public grouping = [EXPORT_ACTION_GROUP];
  private exportJsonIntentId: string | undefined;

  public getIconType() {
    return 'code';
  }

  public readonly getDisplayName = (context: EmbeddableApiContext): string =>
    i18n.translate('dashboard.actions.exportJsonDisplayName', {
      defaultMessage: 'Export JSON',
    });

  public async isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean> {
    if (!isApiCompatible(embeddable)) return false;
    const exportDerivatives: ShareActionIntents[] = (
      shareService?.availableIntegrations(embeddable.type, 'exportDerivatives') ?? []
    ).filter((element) => element.shareType === 'integration' && element.id === 'exportJson');
    if (exportDerivatives.length < 1) return false; // this embeddable type has no JSON export integration

    this.exportJsonIntentId = (exportDerivatives[0] as ShareIntegration).id; // store value so we don't have to refetch
    return true;
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isApiCompatible(embeddable) || !this.exportJsonIntentId)
      throw new IncompatibleActionError();

    const supportsByReference = apiHasLibraryTransforms(embeddable);
    const baseOptions = {
      objectType: embeddable.type,
      objectId: embeddable.uuid,
      objectTypeMeta: {
        title: i18n.translate('dashboard.share.shareModal.title', {
          defaultMessage: `Share ${embeddable.getTypeDisplayName?.() ?? embeddable.type}`,
        }),
        config: {},
      },
      sharingData: {
        title: embeddable.title$.value ?? '',
        isByReference: supportsByReference && (await embeddable.canUnlinkFromLibrary()),
        exportJson: (byReference: boolean = false) => {
          if (supportsByReference && !byReference) {
            return embeddable.getSerializedStateByValue();
          } else {
            return embeddable.serializeState();
          }
        },
      },
    };

    const handler = await shareService?.getExportDerivativeHandler(
      baseOptions,
      this.exportJsonIntentId
    );
    await handler?.();
  }
}
