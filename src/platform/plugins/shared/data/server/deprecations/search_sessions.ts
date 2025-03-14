/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  DeprecationsDetails,
  GetDeprecationsContext,
  RegisterDeprecationsConfig,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
import { SEARCH_SESSION_TYPE, SearchSessionSavedObjectAttributes } from '../../common';

type SearchSessionAttributes = Pick<
  SearchSessionSavedObjectAttributes,
  'name' | 'username' | 'expires'
>;

export const createSearchSessionsDeprecationsConfig: (
  core: CoreSetup
) => RegisterDeprecationsConfig = (core: CoreSetup) => ({
  getDeprecations: async (context: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
    const searchSessionsLink = core.http.basePath.prepend('/app/management/kibana/search_sessions');
    const [coreStart] = await core.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(context.request, {
      includedHiddenTypes: [SEARCH_SESSION_TYPE],
    });
    const results = await savedObjectsClient.find<SearchSessionAttributes>({
      type: 'search-session',
      perPage: 1000,
      fields: ['name', 'username', 'expires'],
      sortField: 'created',
      sortOrder: 'desc',
      namespaces: ['*'],
    });

    const searchSessions: Array<SavedObjectsFindResult<SearchSessionAttributes>> =
      results.saved_objects.filter((so) => new Date(so.attributes.expires).getTime() > Date.now());

    if (!searchSessions.length) {
      return [];
    }

    return [
      {
        title: i18n.translate('data.deprecations.searchSessionsTitle', {
          defaultMessage: 'Search sessions will be disabled by default',
        }),
        message: buildMessage({ searchSessions, searchSessionsLink }),
        deprecationType: 'feature',
        level: 'warning',
        correctiveActions: {
          manualSteps: [
            i18n.translate('data.deprecations.searchSessions.manualStepOneMessage', {
              defaultMessage: 'Navigate to Stack Management > Kibana > Search Sessions',
            }),
            i18n.translate('data.deprecations.searchSessions.manualStepTwoMessage', {
              defaultMessage: 'Delete search sessions that have not expired',
            }),
            i18n.translate('data.deprecations.searchSessions.manualStepTwoMessage', {
              defaultMessage:
                'Alternatively, to continue using search sessions until 9.1, open the kibana.yml config file and add the following: "data.search.sessions.enabled: true"',
            }),
          ],
        },
      },
    ];
  },
});

const buildMessage = ({
  searchSessions,
  searchSessionsLink,
}: {
  searchSessions: Array<SavedObjectsFindResult<SearchSessionAttributes>>;
  searchSessionsLink: string;
}): DeprecationDetailsMessage => ({
  type: 'markdown',
  content: i18n.translate('data.deprecations.scriptedFieldsMessage', {
    defaultMessage: `The search sessions feature is deprecated and is disabled by default in 9.0. You currently have {numberOfSearchSessions} active search session(s): [Manage Search Sessions]({searchSessionsLink})`,
    values: {
      numberOfSearchSessions: searchSessions.length,
      searchSessionsLink,
    },
  }),
});
