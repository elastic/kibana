/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_ANNOTATION_GROUP } from '@kbn/embeddable-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  apiPublishesDescription,
  apiPublishesTitle,
  apiPublishesSavedObjectId,
} from '@kbn/presentation-publishing';
import type { LinksParentApi, LinksSerializedState } from '../types';
import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import { ADD_LINKS_PANEL_ACTION_ID } from './constants';
import { openEditorFlyout } from '../editor/open_editor_flyout';
import { serializeLinksAttributes } from '../lib/serialize_attributes';

export const isParentApiCompatible = (parentApi: unknown): parentApi is LinksParentApi =>
  apiIsPresentationContainer(parentApi) &&
  apiPublishesSavedObjectId(parentApi) &&
  apiPublishesTitle(parentApi) &&
  apiPublishesDescription(parentApi);

export const addLinksPanelAction: ActionDefinition<EmbeddableApiContext> = {
  id: ADD_LINKS_PANEL_ACTION_ID,
  getIconType: () => APP_ICON,
  order: 10,
  isCompatible: async ({ embeddable }) => {
    return isParentApiCompatible(embeddable);
  },
  execute: async ({ embeddable }) => {
    if (!isParentApiCompatible(embeddable)) throw new IncompatibleActionError();
    const runtimeState = await openEditorFlyout({
      parentDashboard: embeddable,
    });
    if (!runtimeState) return;

    function serializeState() {
      if (!runtimeState) return;

      if (runtimeState.savedObjectId !== undefined) {
        return {
          rawState: {
            savedObjectId: runtimeState.savedObjectId,
          },
        };
      }

      const { attributes, references } = serializeLinksAttributes(runtimeState);
      return {
        rawState: {
          attributes,
        },
        references,
      };
    }

    await embeddable.addNewPanel<LinksSerializedState>({
      panelType: CONTENT_ID,
      serializedState: serializeState(),
    });
  },
  grouping: [ADD_PANEL_ANNOTATION_GROUP],
  getDisplayName: () => APP_NAME,
};
