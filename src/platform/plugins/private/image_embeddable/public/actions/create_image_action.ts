/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import {
  ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  IMAGE_EMBEDDABLE_TYPE,
} from '../image_embeddable/constants';
import { ImageConfig, ImageEmbeddableSerializedState } from '../image_embeddable/types';
import { coreServices } from '../services/kibana_services';

export const createImageAction: ActionDefinition<EmbeddableApiContext> = {
  id: ADD_IMAGE_EMBEDDABLE_ACTION_ID,
  getIconType: () => 'image',
  order: 20,
  isCompatible: async ({ embeddable: parentApi }) => apiCanAddNewPanel(parentApi),
  execute: async ({ embeddable: parentApi }) => {
    if (!apiCanAddNewPanel(parentApi)) throw new IncompatibleActionError();

    openLazyFlyout({
      core: coreServices,
      parentApi,
      loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
        const { getImageEditor } = await import('../components/image_editor/get_image_editor');
        return await getImageEditor({
          closeFlyout,
          ariaLabelledBy,
          onSave: (imageConfig: ImageConfig) => {
            parentApi.addNewPanel<ImageEmbeddableSerializedState>({
              panelType: IMAGE_EMBEDDABLE_TYPE,
              serializedState: { rawState: { imageConfig } },
            });
          },
        });
      },
    });
  },
  grouping: [ADD_PANEL_ANNOTATION_GROUP],
  getDisplayName: () =>
    i18n.translate('imageEmbeddable.imageEmbeddableFactory.displayName', {
      defaultMessage: 'Image',
    }),
};
