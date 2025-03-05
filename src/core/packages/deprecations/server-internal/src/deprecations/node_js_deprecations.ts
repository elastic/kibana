/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'node:crypto';
import { i18n } from '@kbn/i18n';
import type { DeprecationsFactory } from '../deprecations_factory';

interface RegisterNodeJsDeprecationsInfo {
  deprecationsFactory: DeprecationsFactory;
}

// The blowfish cipher is only available when node is running with the --openssl-legacy-provider flag
const isOpenSslLegacyProviderEnabled = () => {
  return crypto.getCiphers().includes('blowfish');
};

export const registerNodeJsDeprecationsInfo = ({
  deprecationsFactory,
}: RegisterNodeJsDeprecationsInfo) => {
  /**
   * Note: this deprecation is being detected on a best effort basis. It is possible
   * that multiple Kibanas are running with differing configuration in which case it depends
   * on which Kibana handles the request deprecations... For now, building on the
   * assumption that for this configuration this is a very edge case possibility.
   */
  if (isOpenSslLegacyProviderEnabled()) {
    deprecationsFactory.getRegistry('core.node_js_deprecations').registerDeprecations({
      getDeprecations: () => {
        return [
          {
            deprecationType: 'feature',
            level: 'warning',
            title: i18n.translate('core.deprecations.openSSLDeprecation.title', {
              defaultMessage: 'Detected legacy OpenSSL provider',
            }),
            message: {
              type: 'markdown',
              content: i18n.translate('core.deprecations.openSSLDeprecation.message.markdown', {
                defaultMessage: `Kibana is currently running with the legacy OpenSSL provider enabled, which is not recommended. For your security, these providers will be disabled by default in 9.0. [Learn more](https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-legacy/) about the legacy OpenSSL provider.`,
              }),
            },
            correctiveActions: {
              manualSteps: [
                i18n.translate('core.deprecations.openSSLDeprecation.step1Description', {
                  defaultMessage:
                    'Remove the --openssl-legacy-provider flag from the config/node.options file where Kibana server is running',
                }),
                i18n.translate('core.deprecations.openSSLDeprecation.step2Description', {
                  defaultMessage:
                    'Ensure the --openssl-legacy-provider flag is not being provided via the NODE_OPTIONS environment variable to Kibana.',
                }),
                i18n.translate('core.deprecations.openSSLDeprecation.step3Description', {
                  defaultMessage: 'Restart Kibana.',
                }),
              ],
            },
          },
        ];
      },
    });
  }
};
