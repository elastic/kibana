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

import { schema } from '@kbn/config-schema';
import { AlertInstance } from '../../../../x-pack/plugins/alerting/server';

export const ParamsSchema = schema.object({
  action1: schema.number({ defaultValue: 2 }),
  action2: schema.number({ defaultValue: 2 }),
});

export const alertType = {
  id: 'example.fires-periodic',
  name: 'Fires periodically',
  actionGroups: [
    { id: 'action1', name: 'action1' },
    { id: 'action2', name: 'action2' },
    { id: 'no-op', name: 'no-op' },
  ],
  validate: {
    params: ParamsSchema,
  },
  defaultActionGroupId: 'action1',
  executor,
};

async function executor({ services, params, state }) {
  if (state == null) state = {};
  if (state.executions == null) state.executions = 0;

  const instanceIds = Array.from({ length: 3 }, (v, k) => k + 1);
  instanceIds.map(instanceId => {
    const instance: AlertInstance = services.alertInstanceFactory(instanceId);
    const instanceState = instance.getState();

    if (Object.keys(instanceState).length === 0) {
      instance.scheduleActions('no-op', {});
      instance.replaceState(getInitialState());
      return;
    }
    updateStateAndScheduleActions(instance, instanceId, instanceState, params);
  });
  state.executions++;
  return state;
}

function getInitialState() {
  const filteredGroups = alertType.actionGroups.filter(g => g.name !== 'no-op');

  const initialState = {};
  filteredGroups.map(group => {
    const randomEventCount = Math.round(Math.random() * 100);
    initialState[group.name] = { checks: 1, events: randomEventCount };
  });

  return initialState;
}

function updateStateAndScheduleActions(instance, instanceId, state, params) {
  Object.keys(state).forEach(k => {
    const randomEventCount = Math.round(Math.random() * 100);
    state[k].checks++;
    state[k].events += randomEventCount;

    if (state[k].checks !== params[k]) {
      //   console.log(`no-op on instance ${instanceId} with state ${state[k]}`);
      instance.scheduleActions('no-op', {});
      return;
    }

    const context = {
      date: new Date().toISOString(),
      ...state[k],
    };
    // console.log(`triggering actionGroup ${k} for instance ${instanceId} with state ${state[k]}`);
    instance.scheduleActions(k, { instanceId, ...context });
    state[k].checks = 0;
    state[k].events = 0;
  });
  instance.replaceState(state);
}
