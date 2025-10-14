/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { History } from 'history';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { getSavedSearchUrl } from '@kbn/saved-search-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';

interface SavedSearchURLConflictCalloutProps {
  discoverSession?: DiscoverSession;
  spaces?: SpacesApi;
  history: History;
}

export const SavedSearchURLConflictCallout = ({
  discoverSession,
  spaces,
  history,
}: SavedSearchURLConflictCalloutProps) => {
  if (
    spaces &&
    discoverSession?.id &&
    discoverSession?.sharingSavedObjectProps?.outcome === 'conflict'
  ) {
    const otherObjectId = discoverSession.sharingSavedObjectProps?.aliasTargetId;

    if (otherObjectId) {
      return spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('discover.savedSearchURLConflictCallout.objectNoun', {
          defaultMessage: `''{savedSearch}'' Discover session`,
          values: {
            savedSearch: discoverSession.title,
          },
        }),
        currentObjectId: discoverSession.id,
        otherObjectPath: `${getSavedSearchUrl(otherObjectId)}${history.location.search}`,
        otherObjectId,
      });
    }
  }

  return null;
};
