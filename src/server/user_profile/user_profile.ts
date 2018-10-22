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
interface Capabilities {
  [key: string]: boolean;
}

export class UserProfile {
  private capabilities: Capabilities;
  constructor(profileData: Capabilities = {}) {
    this.capabilities = {
      ...profileData,
    };
  }

  public hasCapability(capability: string, defaultValue: boolean = true): boolean {
    return capability in this.capabilities ? this.capabilities[capability] : defaultValue;
  }

  public canAccessFeature(feature: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`ui:${feature}/read`, defaultValue);
  }

  public canReadSavedObject(savedObjectType: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`saved_objects/${savedObjectType}/get`, defaultValue);
  }

  public canWriteSavedObject(savedObjectType: string, defaultValue: boolean = true): boolean {
    return this.hasCapability(`saved_objects/${savedObjectType}/create`, defaultValue);
  }

  public toJSON() {
    return {
      ...this.capabilities,
    };
  }
}
