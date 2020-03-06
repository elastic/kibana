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

import { AlertInstance } from '../../../../x-pack/plugins/alerting/server';

export const alertType = {
  id: 'example.fires-once',
  name: 'Fires once',
  actionGroups: [
    { id: 'default', name: 'default' },
    { id: 'noop', name: 'noop' },
  ],
  defaultActionGroupId: 'default',
  executor,
};

async function executor({ services, params, state }) {
  if (state == null) state = {};
  if (state.executions == null) state.executions = 0;

  const context = {
    date: new Date().toISOString(),
    count: state.executions,
  };

  const instanceIds = Array.from({ length: 10 }, (v, k) => k + 1);

  instanceIds.map(instanceId => {
    const instance: AlertInstance = services.alertInstanceFactory(instanceId);

    const instanceState = instance.getState();

    if (Object.keys(instanceState).length === 0) {
      instance.scheduleActions('default', { instanceId, ...context });
      instance.replaceState({ fired: true });
      return;
    }

    instance.replaceState(instanceState);
    instance.scheduleActions('noop', {});
  });

  state.executions++;
  return state;
}
