/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { appCategories, CardNavExtensionDefinition } from '@kbn/management-cards-navigation';

export const orgMembersAppName = 'organization_members';

export const orgMembersNavCard: CardNavExtensionDefinition = {
  category: appCategories.ACCESS,
  description: i18n.translate('management.landing.withCardNavigation.membersDescription', {
    defaultMessage: 'Invite team members and assign them roles to access this project.',
  }),
  icon: 'users',
  skipValidation: true,
  href: 'https://cloud.elastic.co/account/members', // ToDo: replace hard-coded URL with resource/const
  title: i18n.translate('management.landing.withCardNavigation.membersTitle', {
    defaultMessage: 'Manage organization members',
  }),
};
