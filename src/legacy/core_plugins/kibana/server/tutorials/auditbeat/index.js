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
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../../../common/tutorials/auditbeat_instructions';

export function auditbeatSpecProvider(context) {
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'auditbeat',
    name: i18n.translate('kbn.server.tutorials.auditbeat.nameTitle', {
      defaultMessage: 'Auditbeat',
    }),
    category: TUTORIAL_CATEGORY.SIEM,
    shortDescription: i18n.translate('kbn.server.tutorials.auditbeat.shortDescription', {
      defaultMessage: 'Collect audit data from your hosts.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.auditbeat.longDescription', {
      defaultMessage:
        'Use Auditbeat to collect auditing data from your hosts. These include \
processes, users, logins, sockets information, file accesses, and more. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.auditbeat}/auditbeat-overview.html',
      },
    }),
    euiIconType: 'securityAnalyticsApp',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/siem',
        label: i18n.translate('kbn.server.tutorials.auditbeat.artifacts.dashboards.linkLabel', {
          defaultMessage: 'SIEM App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.auditbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/auditbeat/screenshot.png',
    onPrem: onPremInstructions(platforms, context),
    elasticCloud: cloudInstructions(platforms),
    onPremElasticCloud: onPremCloudInstructions(platforms),
  };
}
