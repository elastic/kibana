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

import { i18n }  from '@kbn/i18n';
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { onPremInstructions, cloudInstructions, onPremCloudInstructions } from '../../../common/tutorials/filebeat_instructions';

export function awsLogsSpecProvider(server, context) {
  const moduleName = 'aws';
  const platforms = ['OSX', 'DEB', 'RPM', 'WINDOWS'];
  return {
    id: 'awsLogs',
    name: i18n.translate('kbn.server.tutorials.awsLogs.nameTitle', {
      defaultMessage: 'AWS S3 based logs',
    }),
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: i18n.translate('kbn.server.tutorials.awsLogs.shortDescription', {
      defaultMessage: 'Collect AWS logs from S3 bucket with Filebeat.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.awsLogs.longDescription', {
      defaultMessage: 'Collect AWS logs by exporting them to an S3 bucket which is configured with SQS notification. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.filebeat}/filebeat-module-aws.html',
      },
    }),
    euiIconType: 'logoAWS',
    artifacts: {
      dashboards: [
        {
          id: '4746e000-bacd-11e9-9f70-1f7bda85a5eb',
          linkLabel: i18n.translate('kbn.server.tutorials.awsLogs.artifacts.dashboards.linkLabel', {
            defaultMessage: 'AWS S3 server access log dashboard',
          }),
          isOverview: true
        }
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-aws.html'
      }
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/aws_logs/screenshot.png',
    onPrem: onPremInstructions(moduleName, platforms, context),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms)
  };
}
