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

import { i18n } from '@kbn/i18n';

export const createLogstashInstructions = () => ({
  INSTALL: {
    OSX: [
      {
        title: i18n.translate('kbn.common.tutorials.logstashInstructions.install.java.osxTitle', {
          defaultMessage: 'Download and install the Java Runtime Environment',
        }),
        textPre: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.java.osxTextPre',
          {
            defaultMessage: 'Follow the installation instructions [here]({link}).',
            values: {
              link: 'https://docs.oracle.com/javase/8/docs/technotes/guides/install/mac_jre.html',
            },
          }
        ),
      },
      {
        title: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.logstash.osxTitle',
          {
            defaultMessage: 'Download and install Logstash',
          }
        ),
        textPre: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.logstash.osxTextPre',
          {
            defaultMessage: 'First time using Logstash?  See the [Getting Started Guide]({link}).',
            values: {
              link:
                '{config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html',
            },
          }
        ),
        commands: [
          'curl -L -O https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.tar.gz',
          'tar xzvf logstash-{config.kibana.version}.tar.gz',
        ],
      },
    ],
    WINDOWS: [
      {
        title: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.java.windowsTitle',
          {
            defaultMessage: 'Download and install the Java Runtime Environment',
          }
        ),
        textPre: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.java.windowsTextPre',
          {
            defaultMessage: 'Follow the installation instructions [here]({link}).',
            values: {
              link:
                'https://docs.oracle.com/javase/8/docs/technotes/guides/install/windows_jre_install.html',
            },
          }
        ),
      },
      {
        title: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.logstash.windowsTitle',
          {
            defaultMessage: 'Download and install Logstash',
          }
        ),
        textPre: i18n.translate(
          'kbn.common.tutorials.logstashInstructions.install.logstash.windowsTextPre',
          {
            defaultMessage:
              'First time using Logstash?  See the [Getting Started Guide]({logstashLink}).\n\
 1. [Download]({elasticLink}) the Logstash Windows zip file.\n\
 2. Extract the contents of the zip file.',
            values: {
              logstashLink:
                '{config.docs.base_url}guide/en/logstash/current/getting-started-with-logstash.html',
              elasticLink:
                'https://artifacts.elastic.co/downloads/logstash/logstash-{config.kibana.version}.zip',
            },
          }
        ),
      },
    ],
  },
});
