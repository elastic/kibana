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

import moment from 'moment';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { PulseErrorInstructionValue } from '../channel';

export const errorChannelPayloads: PulseErrorInstructionValue[] = [
  {
    channel_id: 'errors',
    deployment_id: '123',
    message: 'Error: [resource_already_exists_exception]',
    hash: 'index [pulse-poc-raw-default/1234567890] already exists',
    status: 'new',
    currentKibanaVersion: 'v7.x',
    timestamp: moment().toDate(),
  },
  {
    channel_id: 'errors',
    deployment_id: '123',
    message: 'Error: [resource_already_exists_exception]',
    hash: 'index [pulse-poc-raw-default/1QJURO2GRfqpFfuOp12rIg] already exists',
    status: 'seen',
    currentKibanaVersion: 'v7.x',
    timestamp: moment()
      .subtract(1, 'days')
      .toDate(),
  },
  {
    channel_id: 'errors',
    deployment_id: '123',
    message: '[TypeError]: Component failed to mount',
    hash: 'generic:arbitraryError 1QJURO2GRfqpFfuOp12rIg',
    status: 'seen',
    fixedVersion: 'v7.5.2',
    currentKibanaVersion: 'v7.x',
    timestamp: moment()
      .subtract(60, 'seconds')
      .toDate(),
  },
];
