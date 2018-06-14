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

export const LOGSTASH_INSTRUCTIONS = {
  INSTALL: {
    OSX: [
      {
        title: 'Download and install the Java Runtime Environment',
        textPre: 'Follow the installation instructions [here](https://docs.oracle.com/javase/8/docs/technotes/guides/install/mac_jre.html).'
      },
      {
        title: 'Download and install Logstash',
        textPre: 'First time using Logstash?  See the ' +
          '[Getting Started Guide]({config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html).',
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
          'tar xzvf logstash-{config.kibana.version}.tar.gz'
        ]
      }
    ],
    WINDOWS: [
      {
        title: 'Download and install the Java Runtime Environment',
        textPre: 'Follow the installation instructions [here](https://docs.oracle.com/javase/8/docs/technotes/guides/install/windows_jre_install.html).'
      },
      {
        title: 'Download and install Logstash',
        textPre: 'First time using Logstash?  See the ' +
          '[Getting Started Guide]({config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html).\n' +
          '  1. [Download](https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.zip) the Logstash Windows zip file.\n' +
          '  2. Extract the contents of the zip file.'
      }
    ],
  }
};
