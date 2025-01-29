/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from '@kbn/crypto';
import type { IExternalUrlPolicy } from '@kbn/core-http-common';
import type { IExternalUrlConfig } from '@kbn/core-http-server';
import { externalUrlConfig } from './config';

const DEFAULT_CONFIG = Object.freeze(externalUrlConfig.schema.validate({}));

/**
 * External Url configuration for use in Kibana.
 * @public
 */
export class ExternalUrlConfig implements IExternalUrlConfig {
  static readonly DEFAULT = new ExternalUrlConfig(DEFAULT_CONFIG);

  public readonly policy: IExternalUrlPolicy[];
  /**
   * Returns the default External Url configuration when passed with no config
   * @internal
   */
  constructor(rawConfig: IExternalUrlConfig) {
    this.policy = rawConfig.policy.map((entry) => {
      if (entry.host) {
        // If the host contains a `[`, then it's likely an IPv6 address. Otherwise, append a `.` if it doesn't already contain one
        const hostToHash =
          entry.host && !entry.host.includes('[') && !entry.host.endsWith('.')
            ? `${entry.host}.`
            : entry.host;
        return {
          ...entry,
          host: createSHA256Hash(hostToHash),
        };
      }
      return entry;
    });
  }
}
