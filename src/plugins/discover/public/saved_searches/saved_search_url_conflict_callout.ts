/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getSavedSearchUrl } from './saved_searches_utils';
import { SAVED_SEARCH_TYPE } from './constants';

import type { SavedSearch } from './types';
import type { SpacesApi } from '../../../../../x-pack/plugins/spaces/public';

interface SavedSearchURLConflictCalloutProps {
  savedSearch?: SavedSearch;
  spaces?: SpacesApi;
}

export const SavedSearchURLConflictCallout = ({
  savedSearch,
  spaces,
}: SavedSearchURLConflictCalloutProps) => {
  if (spaces && savedSearch?.id && savedSearch?.sharingSavedObject?.outcome === 'conflict') {
    const otherObjectId = savedSearch.sharingSavedObject?.aliasTargetId;

    if (otherObjectId) {
      return spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('discover.savedSearchURLConflictCallout.objectNoun', {
          defaultMessage: '{savedSearch} {type}',
          values: {
            savedSearch: savedSearch.title,
            type: SAVED_SEARCH_TYPE,
          },
        }),
        currentObjectId: savedSearch.id,
        otherObjectPath: getSavedSearchUrl(otherObjectId),
        otherObjectId,
      });
    }
  }

  return null;
};
