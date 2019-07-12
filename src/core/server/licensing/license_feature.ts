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

import { LicensingServiceSetup } from './licensing_service_setup';
import { LicenseFeatureSerializer } from './types';

export class LicenseFeature {
  private serializable: LicenseFeatureSerializer = service => ({
    name: this.name,
    isAvailable: this.isAvailable,
    isEnabled: this.isEnabled,
  });

  constructor(
    public name: string,
    private feature: any = {},
    private service: LicensingServiceSetup
  ) {}

  get isAvailable() {
    return !!this.feature.available;
  }

  get isEnabled() {
    return !!this.feature.enabled;
  }

  onObject(serializable: LicenseFeatureSerializer) {
    this.serializable = serializable;
  }

  toObject() {
    return this.serializable(this.service);
  }
}
