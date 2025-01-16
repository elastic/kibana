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
    const [coreStart] = await core.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(context.request, {
      includedHiddenTypes: [SEARCH_SESSION_TYPE],
    });
    const finder = savedObjectsClient.createPointInTimeFinder<SearchSessionAttributes>({
      type: 'search-session',
      perPage: 1000,
      fields: ['name', 'username', 'expires'],
      namespaces: ['*'],
    });

    const searchSessions: Array<SavedObjectsFindResult<SearchSessionAttributes>> = [];

    for await (const response of finder.find()) {
      searchSessions.push(
        ...response.saved_objects.filter(
          (so) => new Date(so.attributes.expires).getTime() > Date.now()
        )
      );
    }

    if (!searchSessions.length) {
      return [];
    }

    return [
      {
        title: i18n.translate('data.deprecations.searchSessionsTitle', {
          defaultMessage: 'Found active search sessions',
        }),
        message: buildMessage({ searchSessions }),
        deprecationType: 'feature',
        level: 'warning',
        correctiveActions: {
          manualSteps: [
            i18n.translate('data.deprecations.searchSessions.manualStepOneMessage', {
              defaultMessage: 'Open the kibana.yml config file.',
            }),
            i18n.translate('data.deprecations.searchSessions.manualStepTwoMessage', {
              defaultMessage: 'Add the following: "data.search.sessions.enabled: true"',
            }),
            i18n.translate('data.deprecations.searchSessions.manualStepTwoMessage', {
              defaultMessage:
                'Alternatively, if you do not want to keep these search sessions after upgrade, navigate to Stack Management > Search Sessions and delete any sessions that have not expired.',
            }),
          ],
        },
      },
    ];
  },
});

const searchSessionIdLabel = i18n.translate(
  'data.deprecations.searchSessions.searchSessionIdLabel',
  {
    defaultMessage: 'ID',
  }
);

const searchSessionNameLabel = i18n.translate(
  'data.deprecations.searchSessions.searchSessionNameLabel',
  {
    defaultMessage: 'Name',
  }
);

const searchSessionUserLabel = i18n.translate(
  'data.deprecations.searchSessions.searchSessionUserLabel',
  {
    defaultMessage: 'User',
  }
);

const searchSessionSpacesLabel = i18n.translate(
  'data.deprecations.searchSessions.searchSessionSpacesLabel',
  {
    defaultMessage: 'Spaces',
  }
);

const buildSearchSessionsListEntry = (
  so: SavedObjectsFindResult<SearchSessionAttributes>
) => `- **${searchSessionIdLabel}:** ${so.id}
  - **${searchSessionNameLabel}:** ${so.attributes.name}
  - **${searchSessionUserLabel}:** ${so.attributes.username}
  - **${searchSessionSpacesLabel}:** ${so.namespaces?.join(', ')}`;

const buildMessage = ({
  searchSessions,
}: {
  searchSessions: Array<SavedObjectsFindResult<SearchSessionAttributes>>;
}): DeprecationDetailsMessage => ({
  type: 'markdown',
  content: i18n.translate('data.deprecations.scriptedFieldsMessage', {
    defaultMessage: `The search sessions feature is deprecated and will be disabled by default in 9.0. You currently have {numberOfSearchSessions} active search session(s). If you would like to continue using, managing, and restoring search sessions in 9.0, you'll need to re-enable them in your kibana.yml configuration file. If not, no action is necessary.
The following is a list of all active search sessions and their associated spaces:
{searchSessionsList}`,
    values: {
      numberOfSearchSessions: searchSessions.length,
      searchSessionsList: searchSessions.map(buildSearchSessionsListEntry).join('\n'),
    },
  }),
});
