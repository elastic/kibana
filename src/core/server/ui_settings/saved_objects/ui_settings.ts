/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsType } from '../../saved_objects';
import { migrations } from './migrations';

export const uiSettingsType: SavedObjectsType = {
  name: 'config',
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      buildNum: {
        type: 'keyword',
      },
    },
  },
  management: {
    importableAndExportable: true,
    getInAppUrl() {
      return {
        path: `/app/management/kibana/settings`,
        uiCapabilitiesPath: 'advancedSettings.show',
      };
    },
    getTitle(obj) {
      return `Advanced Settings [${obj.id}]`;
    },
  },
  migrations,
};
