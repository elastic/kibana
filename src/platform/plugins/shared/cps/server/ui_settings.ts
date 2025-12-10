/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import { CPS_SPACES_PROJECT_ROUTING_ID } from '@kbn/management-settings-ids';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [CPS_SPACES_PROJECT_ROUTING_ID]: {
      description: i18n.translate('cps.uiSettings.spacesProjectRouting.description', {
        defaultMessage: 'Search across this project and any linked projects from a single location with cross-project search. Use these settings to limit the space default scope to a specific subset of projects.',
      }),
      name: i18n.translate('cps.uiSettings.spacesProjectRouting.name', {
        defaultMessage: 'Cross-project search',
      }),
      value: 'ALL',
      options: ['_alias:_origin', 'ALL'],
      optionLabels: {
        currentProject: i18n.translate('cps.uiSettings.spacesProjectRouting.option.currentProject', {
          defaultMessage: 'Current project',
        }),
        allProjects: i18n.translate('cps.uiSettings.spacesProjectRouting.option.allProjects', {
          defaultMessage: 'All projects',
        }),
      },
      type: 'select',
      schema: schema.oneOf([schema.literal('_alias:_origin'), schema.literal('ALL')]),
      category: ['general'],
      requiresPageReload: true,
    },
  });
};

