/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { ConfigDeprecationProvider } from '@kbn/config';

export type KibanaConfigType = TypeOf<typeof config.schema>;

const deprecations: ConfigDeprecationProvider = () => [
  (settings, fromPath, addDeprecation) => {
    const kibana = settings[fromPath];
    if (kibana?.index) {
      addDeprecation({
        title: i18n.translate('core.kibana.index.deprecationTitle', {
          defaultMessage: `Setting "kibana.index" is deprecated`,
        }),
        message: i18n.translate('core.kibana.index.deprecationMessage', {
          defaultMessage: `"kibana.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`,
        }),
        documentationUrl: 'https://ela.st/kbn-remove-legacy-multitenancy',
        correctiveActions: {
          manualSteps: [
            i18n.translate('core.kibana.index.deprecationManualStep1', {
              defaultMessage: `If you rely on this setting to achieve multitenancy you should use Spaces, cross-cluster replication, or cross-cluster search instead.`,
            }),
            i18n.translate('core.kibana.index.deprecationManualStep2', {
              defaultMessage: `To migrate to Spaces, we encourage using saved object management to export your saved objects from a tenant into the default tenant in a space.`,
            }),
          ],
        },
      });
    }
    return settings;
  },
];

export const config = {
  path: 'kibana',
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: '.kibana' }),
  }),
  deprecations,
};
