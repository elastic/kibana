/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RegistryItem } from '@kbn/embeddable-plugin/public/add_from_library/registry';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { apiHasUniqueId, apiPublishesEditablePauseFetch } from '@kbn/presentation-publishing';
import { addControlsFromSavedSession } from './add_controls_from_saved_session';

type OnAddParams = Parameters<RegistryItem['onAdd']>;

export const addPanelFromLibrary: (...params: OnAddParams) => Promise<void> = async (
  container,
  savedObject
) => {
  const savedSessionAttributes = savedObject.attributes as SavedSearchAttributes;
  const mightHaveVariables =
    apiPublishesESQLVariables(container) &&
    savedSessionAttributes.controlGroupJson &&
    savedSessionAttributes.controlGroupJson.length > 0;

  // pause fetching so that we don't try to build an ES|QL query without necessary variables
  const shouldPauseFetch = mightHaveVariables && apiPublishesEditablePauseFetch(container);
  if (shouldPauseFetch) container.setFetchPaused(true);

  const api = await container.addNewPanel(
    {
      panelType: SEARCH_EMBEDDABLE_TYPE,
      serializedState: {
        savedObjectId: savedObject.id,
      },
    },
    {
      displaySuccessMessage: true,
    }
  );

  const uuid = apiHasUniqueId(api) ? api.uuid : undefined;
  if (mightHaveVariables) {
    await addControlsFromSavedSession(
      container,
      savedSessionAttributes.controlGroupJson!, // this is verified via mightHaveVariables
      uuid
    );
  }

  // unpause fetching if necessary now that ES|QL variables exist
  if (shouldPauseFetch) container.setFetchPaused(false);
};
