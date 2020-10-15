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
import { onPremInstructions } from './envs/on_prem';
import apmIndexPattern from './index_pattern.json';
import { ArtifactsSchema, TutorialsCategory } from '../../../../../src/plugins/home/server';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../common/index_pattern_constants';

const apmIntro = i18n.translate('apmOss.tutorial.introduction', {
  defaultMessage: 'Collect in-depth performance metrics and errors from inside your applications.',
});
const moduleName = 'apm';

export const tutorialProvider = ({
  indexPatternTitle,
  indices,
}: {
  indexPatternTitle: string;
  indices: {
    errorIndices: string;
    transactionIndices: string;
    metricsIndices: string;
    sourcemapIndices: string;
    onboardingIndices: string;
  };
}) => () => {
  const savedObjects = [
    {
      ...apmIndexPattern,
      id: APM_STATIC_INDEX_PATTERN_ID,
      attributes: {
        ...apmIndexPattern.attributes,
        title: indexPatternTitle,
      },
    },
  ];

  const artifacts: ArtifactsSchema = {
    dashboards: [
      {
        id: '8d3ed660-7828-11e7-8c47-65b845b5cfb3',
        linkLabel: i18n.translate('apmOss.tutorial.specProvider.artifacts.dashboards.linkLabel', {
          defaultMessage: 'APM dashboard',
        }),
        isOverview: true,
      },
    ],
  };

  return {
    id: 'apm',
    name: i18n.translate('apmOss.tutorial.specProvider.name', {
      defaultMessage: 'APM',
    }),
    moduleName,
    category: TutorialsCategory.OTHER,
    shortDescription: apmIntro,
    longDescription: i18n.translate('apmOss.tutorial.specProvider.longDescription', {
      defaultMessage:
        'Application Performance Monitoring (APM) collects in-depth \
performance metrics and errors from inside your application. \
It allows you to monitor the performance of thousands of applications in real time. \
[Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink:
          '{config.docs.base_url}guide/en/apm/get-started/{config.docs.version}/index.html',
      },
    }),
    euiIconType: 'apmApp',
    artifacts,
    onPrem: onPremInstructions(indices),
    previewImagePath: '/plugins/apmOss/assets/apm.png',
    savedObjects,
    savedObjectsInstallMsg: i18n.translate('apmOss.tutorial.specProvider.savedObjectsInstallMsg', {
      defaultMessage: 'An APM index pattern is required for some features in the APM UI.',
    }),
  };
};
