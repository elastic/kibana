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

export const alertType = {
  id: 'example.always-firing',
  name: 'Always firing',
  actionGroups: [{ id: 'default', name: 'default' }],
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
    services
      .alertInstanceFactory(instanceId)
      .scheduleActions('default', { instanceId, ...context });
  });

  state.executions++;
  return state;
}
