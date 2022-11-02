/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { GuideConfig } from '../../types';

export const searchConfig: GuideConfig = {
  title: i18n.translate('guidedOnboarding.searchGuide.title', {
    defaultMessage: 'Search my data',
  }),
  description: i18n.translate('guidedOnboarding.searchGuide.description', {
    defaultMessage: `Build custom search experiences with your data using using Elastic’s out-of-the-box web crawler, connectors, and robust APIs. Gain deep insights from the built-in search analytics to curate results and optimize relevance. `,
  }),
  guideName: 'Enterprise Search',
  steps: [
    {
      id: 'add_data',
      title: i18n.translate('guidedOnboarding.searchGuide.addDataStep.title', {
        defaultMessage: 'Add data',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.searchGuide.addDataStep.description1', {
          defaultMessage: 'Select an ingestion method.',
        }),
        i18n.translate('guidedOnboarding.searchGuide.addDataStep.description2', {
          defaultMessage: 'Create a new Elasticsearch index.',
        }),
        i18n.translate('guidedOnboarding.searchGuide.addDataStep.description3', {
          defaultMessage: 'Configure your ingestion settings.',
        }),
      ],
      location: {
        appID: 'enterpriseSearch',
        path: '',
      },
    },
    {
      id: 'search_experience',
      title: i18n.translate('guidedOnboarding.searchGuide.searchExperienceStep.title', {
        defaultMessage: 'Build a search experience',
      }),
      description: i18n.translate('guidedOnboarding.searchGuide.searchExperienceStep.description', {
        defaultMessage: 'Take a tour of Elastic’s relevance refinement tools, including:',
      }),
      descriptionList: [
        i18n.translate('guidedOnboarding.searchGuide.searchExperienceStep.descriptionList.item1', {
          defaultMessage: 'Tuning for relevance and precision.',
        }),
        i18n.translate('guidedOnboarding.searchGuide.searchExperienceStep.descriptionList.item2', {
          defaultMessage: 'Adaptive relevance and curations',
        }),
        i18n.translate('guidedOnboarding.searchGuide.searchExperienceStep.descriptionList.item3', {
          defaultMessage: 'Synonym management',
        }),
      ],
      location: {
        appID: 'enterpriseSearch',
        path: '/search_experiences',
      },
    },
  ],
};
