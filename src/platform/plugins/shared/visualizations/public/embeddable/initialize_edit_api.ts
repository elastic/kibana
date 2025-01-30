/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  PublishingSubject,
  apiHasAppContext,
  apiPublishesTimeRange,
} from '@kbn/presentation-publishing';
import { TimeRange } from '@kbn/es-query';
import type { Vis } from '../vis';
import { urlFor } from '..';
import { getCapabilities, getEmbeddable } from '../services';

export function initializeEditApi({
  customTimeRange$,
  description$,
  parentApi,
  savedObjectId$,
  searchSessionId$,
  title$,
  vis$,
  uuid,
}: {
  customTimeRange$: PublishingSubject<TimeRange | undefined>;
  description$: PublishingSubject<string | undefined>;
  parentApi?: unknown;
  savedObjectId$: PublishingSubject<string | undefined>;
  searchSessionId$: PublishingSubject<string | undefined>;
  title$: PublishingSubject<string | undefined>;
  vis$: PublishingSubject<Vis>;
  uuid: string;
}) {
  return !parentApi || !apiHasAppContext(parentApi)
    ? {}
    : {
        getTypeDisplayName: () =>
          i18n.translate('visualizations.displayName', {
            defaultMessage: 'visualization',
          }),
        onEdit: async () => {
          const stateTransferService = getEmbeddable().getStateTransfer();
          const visId = savedObjectId$.getValue();
          const editPath = visId ? urlFor(visId) : '#/edit_by_value';
          const parentTimeRange = apiPublishesTimeRange(parentApi)
            ? parentApi.timeRange$.getValue()
            : {};
          const customTimeRange = customTimeRange$.getValue();
          const parentApiContext = parentApi.getAppContext();

          await stateTransferService.navigateToEditor('visualize', {
            path: editPath,
            state: {
              embeddableId: uuid,
              valueInput: {
                savedVis: vis$.getValue().serialize(),
                title: title$.getValue(),
                description: description$.getValue(),
                timeRange: customTimeRange ?? parentTimeRange,
              },
              originatingApp: parentApiContext?.currentAppId,
              searchSessionId: searchSessionId$.getValue() || undefined,
              originatingPath: parentApiContext?.getCurrentPath?.(),
            },
          });
        },
        isEditingEnabled: () => {
          const readOnly = Boolean(vis$.getValue().type.disableEdit);
          if (readOnly) return false;
          const capabilities = getCapabilities();
          const isByValue = !savedObjectId$.getValue();
          if (isByValue)
            return Boolean(
              capabilities.dashboard_v2?.showWriteControls && capabilities.visualize_v2?.show
            );
          else return Boolean(capabilities.visualize_v2?.save);
        },
      };
}
