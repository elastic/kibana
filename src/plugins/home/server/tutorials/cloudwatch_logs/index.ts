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
import { TutorialsCategory } from '../../services/tutorials';
import {
  onPremInstructions,
  cloudInstructions,
  onPremCloudInstructions,
} from '../instructions/functionbeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function cloudwatchLogsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'aws';
  return {
    id: 'cloudwatchLogs',
    name: i18n.translate('home.tutorials.cloudwatchLogs.nameTitle', {
      defaultMessage: 'AWS Cloudwatch logs',
    }),
    moduleName,
    category: TutorialsCategory.LOGGING,
    shortDescription: i18n.translate('home.tutorials.cloudwatchLogs.shortDescription', {
      defaultMessage: 'Collect Cloudwatch logs with Functionbeat.',
    }),
    longDescription: i18n.translate('home.tutorials.cloudwatchLogs.longDescription', {
      defaultMessage:
        'Collect Cloudwatch logs by deploying Functionbeat to run as \
        an AWS Lambda function. \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.functionbeat}/functionbeat-getting-started.html',
      },
    }),
    euiIconType: 'logoAWS',
    artifacts: {
      dashboards: [
        // TODO
      ],
      exportedFields: {
        documentationUrl: '{config.docs.beats.functionbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions([], context),
    elasticCloud: cloudInstructions(),
    onPremElasticCloud: onPremCloudInstructions(),
  };
}
