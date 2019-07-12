/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { createHash } from 'crypto';
import { LicenseFeature } from './license_feature';
import { LICENSE_STATUS, LICENSE_TYPE } from './constants';
import { LicenseType } from './types';

function toLicenseType(minimumLicenseRequired: LICENSE_TYPE | string) {
  if (typeof minimumLicenseRequired !== 'string') {
    return minimumLicenseRequired;
  }

  if (!(minimumLicenseRequired in LICENSE_TYPE)) {
    throw new Error(`${minimumLicenseRequired} is not a valid license type`);
  }

  return LICENSE_TYPE[minimumLicenseRequired as LicenseType];
}

export class LicensingServiceSetup {
  private readonly _license: any;
  private readonly license: any;
  private readonly features: any;
  private _signature!: string;
  private objectified!: any;
  private featuresMap: Map<string, LicenseFeature>;

  constructor(
    license: any,
    features: any,
    private error: Error | null,
    private clusterSource: string
  ) {
    this._license = license;
    this.license = license || {};
    this.features = features;
    this.featuresMap = new Map<string, LicenseFeature>();
  }

  get uid() {
    return this.license.uid;
  }

  get isActive() {
    return this.license.status === 'active';
  }

  get expiryDateInMillis() {
    return this.license.expiry_date_in_millis;
  }

  get type() {
    return this.license.type;
  }

  get isAvailable() {
    return !!this._license;
  }

  get mode() {
    return this.license.mode;
  }

  get isBasic() {
    return this.isActive && this.mode === 'basic';
  }

  get isNotBasic() {
    return this.isActive && this.mode !== 'basic';
  }

  get reasonUnavailable() {
    if (!this._license) {
      return `[${this.clusterSource}] Elasticsearch cluster did not respond with license information.`;
    }

    if (this.error instanceof Error && (this.error as any).status === 400) {
      return `X-Pack plugin is not installed on the [${this.clusterSource}] Elasticsearch cluster.`;
    }

    return this.error;
  }

  get signature() {
    if (this._signature !== undefined) {
      return this._signature;
    }

    this._signature = createHash('md5')
      .update(JSON.stringify(this.toObject()))
      .digest('hex');

    return this._signature;
  }

  isOneOf(candidateLicenses: string | string[]) {
    if (!Array.isArray(candidateLicenses)) {
      candidateLicenses = [candidateLicenses];
    }

    return candidateLicenses.includes(this.license.mode);
  }

  meetsMinimumOf(minimum: LICENSE_TYPE) {
    return minimum >= LICENSE_TYPE[this.mode as LicenseType];
  }

  check(pluginName: string, minimumLicenseRequired: LICENSE_TYPE | string) {
    const minimum = toLicenseType(minimumLicenseRequired);

    if (!this._license || !this.isAvailable) {
      return {
        status: LICENSE_STATUS.Unavailable,
        message: i18n.translate('xpack.server.checkLicense.errorUnavailableMessage', {
          defaultMessage:
            'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName },
        }),
      };
    }

    const { type: licenseType } = this.license;

    if (!this.meetsMinimumOf(minimum)) {
      return {
        status: LICENSE_STATUS.Invalid,
        message: i18n.translate('xpack.server.checkLicense.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType, pluginName },
        }),
      };
    }

    if (!this.license.isActive) {
      return {
        status: LICENSE_STATUS.Expired,
        message: i18n.translate('xpack.server.checkLicense.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType, pluginName },
        }),
      };
    }

    return { status: LICENSE_STATUS.Valid };
  }

  toObject() {
    if (this.objectified) {
      return this.objectified;
    }

    this.objectified = {
      license: {
        type: this.type,
        isActive: this.isActive,
        expiryDateInMillis: this.expiryDateInMillis,
      },
      features: [...this.featuresMap].map(([, feature]) => feature.toObject()),
    };

    return this.objectified;
  }

  feature(name: string) {
    if (!this.featuresMap.has(name)) {
      this.featuresMap.set(name, new LicenseFeature(name, this.features[name], this));
    }

    return this.featuresMap.get(name);
  }
}
