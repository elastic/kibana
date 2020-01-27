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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export const getAll = () => [
  {
    id: 'red',
    title: i18n.translate('server.status.redTitle', {
      defaultMessage: 'Red',
    }),
    icon: 'danger',
    uiColor: 'danger',
    severity: 1000,
    nicknames: ['Danger Will Robinson! Danger!'],
  },
  {
    id: 'uninitialized',
    title: i18n.translate('server.status.uninitializedTitle', {
      defaultMessage: 'Uninitialized',
    }),
    icon: 'spinner',
    uiColor: 'default',
    severity: 900,
    nicknames: ['Initializing'],
  },
  {
    id: 'yellow',
    title: i18n.translate('server.status.yellowTitle', {
      defaultMessage: 'Yellow',
    }),
    icon: 'warning',
    uiColor: 'warning',
    severity: 800,
    nicknames: ['S.N.A.F.U', "I'll be back", 'brb'],
  },
  {
    id: 'green',
    title: i18n.translate('server.status.greenTitle', {
      defaultMessage: 'Green',
    }),
    icon: 'success',
    uiColor: 'secondary',
    severity: 0,
    nicknames: ['Looking good'],
  },
  {
    id: 'disabled',
    title: i18n.translate('server.status.disabledTitle', {
      defaultMessage: 'Disabled',
    }),
    severity: -1,
    icon: 'toggle-off',
    uiColor: 'default',
    nicknames: ['Am I even a thing?'],
  },
];

export const getAllById = () => _.indexBy(exports.getAll(), 'id');

export const defaults = {
  icon: 'question',
  severity: Infinity,
};

export function get(id) {
  return exports.getAllById()[id] || _.defaults({ id: id }, exports.defaults);
}
