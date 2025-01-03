/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../common';
import { FILES_MANAGE_PRIVILEGE } from '../common/constants';
import { hiddenTypes } from './saved_objects';

// TODO: This should be registered once we have a management section for files content
export const filesFeature: KibanaFeatureConfig = {
  id: PLUGIN_ID,
  name: i18n.translate('files.featureRegistry.filesFeatureName', {
    defaultMessage: 'Files',
  }),
  minimumLicense: 'basic',
  order: 10000,
  category: DEFAULT_APP_CATEGORIES.management,
  app: [PLUGIN_ID],
  privilegesTooltip: i18n.translate('files.featureRegistry.filesPrivilegesTooltip', {
    defaultMessage: 'Provide access to files across all apps',
  }),
  privileges: {
    all: {
      app: [PLUGIN_ID],
      savedObject: {
        all: hiddenTypes,
        read: hiddenTypes,
      },
      ui: [],
      api: [FILES_MANAGE_PRIVILEGE],
    },
    read: {
      app: [PLUGIN_ID],
      savedObject: {
        all: hiddenTypes,
        read: hiddenTypes,
      },
      ui: [],
    },
  },
};
