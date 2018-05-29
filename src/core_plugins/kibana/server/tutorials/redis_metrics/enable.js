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

export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the redis module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `modules.d/redis.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the redis module',
    commands: [
      'sudo metricbeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/redis.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the redis module',
    commands: [
      'sudo metricbeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/redis.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the redis module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable redis',
    ],
    textPost: 'Modify the settings in the `modules.d/redis.yml` file.'
  }
};
