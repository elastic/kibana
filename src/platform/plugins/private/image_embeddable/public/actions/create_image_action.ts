/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { ImageEmbeddableState } from '../../server';
import { ADD_IMAGE_EMBEDDABLE_ACTION_ID, IMAGE_EMBEDDABLE_TYPE } from '../../common/constants';
import type { ImageConfig } from '../types';
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
            parentApi.addNewPanel<ImageEmbeddableState>({
              panelType: IMAGE_EMBEDDABLE_TYPE,
              serializedState: { imageConfig },
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
