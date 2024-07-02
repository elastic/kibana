/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SubFeaturePrivilegeGroupConfig,
  SubFeaturePrivilegeGroupType,
} from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { UPTIME_SYNTHETICS_RULE_TYPES } from '@kbn/rule-data-utils';
import { SYNTHETICS_SO_TYPES } from '../saved_objects';

export const UPTIME_APP_ID = 'uptime';
export const SYNTHETICS_APP_ID = 'synthetics';

export const PLUGIN = {
  APP_ROOT_ID: 'react-uptime-root',
  DESCRIPTION: i18n.translate('xpack.synthetics.pluginDescription', {
    defaultMessage: 'Synthetics monitoring',
    description: 'The description text that will appear in the feature catalogue.',
  }),
  ID: 'uptime',
  SYNTHETICS_PLUGIN_ID: 'synthetics',
  LOCAL_STORAGE_KEY: 'xpack.synthetics.',
  NAME: i18n.translate('xpack.synthetics.featureRegistry.syntheticsFeatureName', {
    defaultMessage: 'Synthetics and Uptime',
  }),
  TITLE: i18n.translate('xpack.synthetics.uptimeFeatureCatalogueTitle', {
    defaultMessage: 'Uptime',
  }),
  SYNTHETICS: i18n.translate('xpack.synthetics.syntheticsFeatureCatalogueTitle', {
    defaultMessage: 'Synthetics',
  }),
};

export const SYNTHETICS_SUB_FEATURE = {
  groupType: 'mutually_exclusive' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'synthetics_all',
      name: 'All',
      includeIn: 'all',
      app: ['uptime', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'uptime-write', 'lists-all', 'rac'],
      savedObject: {
        all: SYNTHETICS_SO_TYPES,
        read: [],
      },
      alerting: {
        rule: {
          all: UPTIME_SYNTHETICS_RULE_TYPES,
        },
        alert: {
          all: UPTIME_SYNTHETICS_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: [
        'synthetics:save',
        'synthetics:configureSettings',
        'synthetics:show',
        'synthetics:alerting:save',
      ],
    },
    {
      id: 'synthetics_read',
      name: 'Read',
      includeIn: 'read',
      app: ['uptime', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'lists-read', 'rac'],
      savedObject: {
        all: [],
        read: SYNTHETICS_SO_TYPES,
      },
      alerting: {
        rule: {
          read: UPTIME_SYNTHETICS_RULE_TYPES,
        },
        alert: {
          read: UPTIME_SYNTHETICS_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['synthetics:show', 'synthetics:alerting:save'],
    },
  ],
};

export const SYNTHETICS_ELASTIC_MANAGED_LOCATIONS_SUB_FEATURE: SubFeaturePrivilegeGroupConfig = {
  groupType: 'independent' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'elastic_managed_locations_enabled',
      name: i18n.translate('xpack.synthetics.features.elasticManagedLocations', {
        defaultMessage: 'Elastic managed locations enabled',
      }),
      includeIn: 'all',
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['synthetics:elasticManagedLocationsEnabled'],
    },
  ],
};
