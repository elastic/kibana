/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
        learnMoreLink:
          '{config.docs.beats.functionbeat}/functionbeat-installation-configuration.html',
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
