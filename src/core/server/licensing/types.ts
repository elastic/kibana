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

import { BehaviorSubject } from 'rxjs';
import { TypeOf } from '@kbn/config-schema';
import { HttpServiceSetup } from '../http';
import { schema } from './schema';
import { LICENSE_TYPE } from './constants';
import { LicensingServiceSetup } from './licensing_service_setup';

/** @public */
export type LicensingServiceSubject = BehaviorSubject<LicensingServiceSetup | null>;
/** @public */
export type LicensingConfigType = TypeOf<typeof schema>;
/** @public */
export type LicenseType = keyof typeof LICENSE_TYPE;
/** @public */
export interface LicensingSetupDependencies {
  http: HttpServiceSetup;
}
/** @public */
export type LicenseFeatureSerializer = (service: LicensingServiceSetup) => any;
