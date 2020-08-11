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
} from '../instructions/heartbeat_instructions';
import {
  TutorialContext,
  TutorialSchema,
} from '../../services/tutorials/lib/tutorials_registry_types';

export function uptimeMonitorsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'uptime';
  return {
    id: 'uptimeMonitors',
    name: i18n.translate('home.tutorials.uptimeMonitors.nameTitle', {
      defaultMessage: 'Uptime Monitors',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.uptimeMonitors.shortDescription', {
      defaultMessage: 'Monitor services for their availability',
    }),
    longDescription: i18n.translate('home.tutorials.uptimeMonitors.longDescription', {
      defaultMessage:
        'Monitor services for their availability with active probing. \
        Given a list of URLs, Heartbeat asks the simple question: Are you alive? \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.heartbeat}/heartbeat-getting-started.html',
      },
    }),
    euiIconType: 'uptimeApp',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/uptime',
        label: i18n.translate('home.tutorials.uptimeMonitors.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Uptime App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.heartbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/uptime_monitors/screenshot.png',
    onPrem: onPremInstructions([], context),
    elasticCloud: cloudInstructions(),
    onPremElasticCloud: onPremCloudInstructions(),
  };
}
