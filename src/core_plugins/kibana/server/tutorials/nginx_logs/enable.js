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
    title: 'Enable and configure the nginx module',
    textPre: 'From the installation directory, run:',
    commands: [
      './filebeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the nginx module',
    commands: [
      'sudo filebeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/nginx.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the nginx module',
    commands: [
      'sudo filebeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/nginx.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the nginx module',
    textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable nginx',
    ],
    textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
  }
};
