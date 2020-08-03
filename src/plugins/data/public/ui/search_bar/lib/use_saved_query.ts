/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { SavedQuery } from '../../../query';
import { DataPublicPluginStart } from '../../..';
import { populateStateFromSavedQuery } from './populate_state_from_saved_query';
import { clearStateFromSavedQuery } from './clear_saved_query';

interface UseSavedQueriesProps {
  queryService: DataPublicPluginStart['query'];
  notifications: CoreStart['notifications'];
  savedQueryId?: string;
}

interface UseSavedQueriesReturn {
  savedQuery?: SavedQuery;
  setSavedQuery: (savedQuery: SavedQuery) => void;
  clearSavedQuery: () => void;
}

export const useSavedQuery = (props: UseSavedQueriesProps): UseSavedQueriesReturn => {
  // Handle saved queries
  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>();

  // Effect is used to convert a saved query id into an object
  useEffect(() => {
    const fetchSavedQuery = async (savedQueryId: string) => {
      try {
        // fetch saved query
        const newSavedQuery = await props.queryService.savedQueries.getSavedQuery(savedQueryId);
        // Make sure we set the saved query to the most recent one
        if (newSavedQuery && newSavedQuery.id === savedQueryId) {
          setSavedQuery(newSavedQuery);
          populateStateFromSavedQuery(props.queryService, newSavedQuery);
        }
      } catch (error) {
        // Clear saved query
        setSavedQuery(undefined);
        clearStateFromSavedQuery(props.queryService);
        // notify of saving error
        props.notifications.toasts.addWarning({
          title: i18n.translate('data.search.unableToGetSavedQueryToastTitle', {
            defaultMessage: 'Unable to load saved query {savedQueryId}',
            values: { savedQueryId },
          }),
          text: `${error.message}`,
        });
      }
    };

    if (props.savedQueryId) fetchSavedQuery(props.savedQueryId);
    else setSavedQuery(undefined);
  }, [
    props.notifications.toasts,
    props.queryService,
    props.queryService.savedQueries,
    props.savedQueryId,
  ]);

  return {
    savedQuery,
    setSavedQuery: (q: SavedQuery) => {
      setSavedQuery(q);
      populateStateFromSavedQuery(props.queryService, q);
    },
    clearSavedQuery: () => {
      setSavedQuery(undefined);
      clearStateFromSavedQuery(props.queryService);
    },
  };
};
