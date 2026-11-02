/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, firstValueFrom } from 'rxjs';
import {
  apiCanAddNewPanel,
  apiPublishesChildrenLoading,
  apiPublishesEditablePauseFetch,
} from '@kbn/presentation-publishing';
import { addControlsFromSavedSession } from './add_controls_from_saved_session';

/**
 * Adds the session's ES|QL controls that the parent is missing, once the parent's panels have
 * loaded so their controls are known.
 */
export const addMissingSessionControls = async ({
  parentApi,
  controlGroupJson,
  uuid,
}: {
  parentApi: unknown;
  controlGroupJson: string | undefined;
  uuid: string;
}): Promise<void> => {
  if (!controlGroupJson || !apiCanAddNewPanel(parentApi)) return;

  // Pause fetching so the panel doesn't query with variables that don't exist yet
  const shouldPauseFetch = apiPublishesEditablePauseFetch(parentApi);
  if (shouldPauseFetch) parentApi.setFetchPaused(true);

  try {
    if (apiPublishesChildrenLoading(parentApi)) {
      await firstValueFrom(parentApi.childrenLoading$.pipe(filter((loading) => !loading)));
    }
    await addControlsFromSavedSession(parentApi, controlGroupJson, uuid);
  } finally {
    if (shouldPauseFetch) parentApi.setFetchPaused(false);
  }
};
