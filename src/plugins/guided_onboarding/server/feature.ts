/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { PLUGIN_FEATURE, PLUGIN_ID } from '../common/constants';
import { guideStateSavedObjectsType, pluginStateSavedObjectsType } from './saved_objects';

export const GUIDED_ONBOARDING_FEATURE: KibanaFeatureConfig = {
  id: PLUGIN_FEATURE,
  name: i18n.translate('guidedOnboarding.featureRegistry.featureName', {
    defaultMessage: 'Setup guides',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [PLUGIN_ID],
  privileges: {
    all: {
      app: [PLUGIN_ID],
      savedObject: {
        all: [guideStateSavedObjectsType, pluginStateSavedObjectsType],
        read: [],
      },
      ui: ['enabled'],
    },
    read: {
      // we haven't implemented "read-only" access yet, so this feature can only be granted
      // as "all" or "none"
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
  },
};
