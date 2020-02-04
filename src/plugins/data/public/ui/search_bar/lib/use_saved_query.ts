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

import { useState, useMemo, useEffect, DependencyList, SetStateAction, Dispatch } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { SavedQuery } from '../../../query';
import { DataPublicPluginStart } from '../../..';
import { populateStateFromSavedQuery } from './populate_state_from_saved_query';
import { clearStateFromSavedQuery } from './clear_saved_query';

interface UseSavedQueriesProps {
  queryService: DataPublicPluginStart['query'];
  setQuery: Function;
  notifications: CoreStart['notifications'];
  uiSettings: CoreStart['uiSettings'];
  savedQueryId?: string;
}

type UseSavedQueriesRet = [
  SavedQuery | undefined,
  Dispatch<SetStateAction<SavedQuery | undefined>>
];

export const useSavedQuery = (
  props: UseSavedQueriesProps,
  deps: DependencyList
): UseSavedQueriesRet => {
  // Handle saved queries
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();
  useMemo(() => {
    const fetchSavedQuery = async () => {
      if (props.savedQueryId) {
        try {
          // fetch saved query
          const newSavedQuery = await props.queryService.savedQueries.getSavedQuery(
            props.savedQueryId
          );
          // Make sure we set the saved query to the most recent one
          if (newSavedQuery && newSavedQuery.id === props.savedQueryId) {
            setSavedQuery(newSavedQuery);
          }
        } catch (error) {
          // Clear saved query
          setSavedQuery(undefined);
          // notify of saving error
          props.notifications.toasts.addWarning({
            title: i18n.translate('data.search.unableToGetSavedQueryToastTitle', {
              defaultMessage: 'Unable to load saved query {savedQueryId}',
              values: { savedQueryId: props.savedQueryId },
            }),
            text: `${error.message}`,
          });
        }
      } else {
        // Clear saved query
        setSavedQuery(undefined);
      }
    };

    fetchSavedQuery();
  }, [props.notifications.toasts, props.queryService.savedQueries, props.savedQueryId]);

  useEffect(() => {
    if (savedQuery) {
      populateStateFromSavedQuery(props.queryService, savedQuery, props.setQuery);
    } else {
      clearStateFromSavedQuery(props.queryService, props.setQuery, props.uiSettings);
    }
  }, [savedQuery, props.queryService, props.setQuery, props.uiSettings]);

  return [savedQuery, setSavedQuery];
};
