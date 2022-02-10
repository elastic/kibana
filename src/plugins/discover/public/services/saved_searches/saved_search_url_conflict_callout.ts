/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { History } from 'history';
import { getSavedSearchUrl } from './saved_searches_utils';

import type { SavedSearch } from './types';
import type { SpacesApi } from '../../../../../../x-pack/plugins/spaces/public';

interface SavedSearchURLConflictCalloutProps {
  savedSearch?: SavedSearch;
  spaces?: SpacesApi;
  history: () => History;
}

export const SavedSearchURLConflictCallout = ({
  savedSearch,
  spaces,
  history,
}: SavedSearchURLConflictCalloutProps) => {
  if (spaces && savedSearch?.id && savedSearch?.sharingSavedObjectProps?.outcome === 'conflict') {
    const otherObjectId = savedSearch.sharingSavedObjectProps?.aliasTargetId;

    if (otherObjectId) {
      return spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('discover.savedSearchURLConflictCallout.objectNoun', {
          defaultMessage: '{savedSearch} search',
          values: {
            savedSearch: savedSearch.title,
          },
        }),
        currentObjectId: savedSearch.id,
        otherObjectPath: `${getSavedSearchUrl(otherObjectId)}${history().location.search}`,
        otherObjectId,
      });
    }
  }

  return null;
};
