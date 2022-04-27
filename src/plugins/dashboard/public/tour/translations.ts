/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DashboardTourStrings = {
  viewModeTour: {
    getTitle: () =>
      i18n.translate('dashboard.tour.viewMode.title', {
        defaultMessage: 'Ready to create something brilliant?',
      }),
    getDescription: () =>
      i18n.translate('dashboard.tour.viewMode.firstStep.description', {
        defaultMessage:
          'Build maps, charts, gauges, and other visualizations that best display your data.',
      }),
  },
  editModeTour: {
    getTitle: () =>
      i18n.translate('dashboard.tour.editMode.title', {
        defaultMessage: 'Dashboard tour',
      }),
    firstStep: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.firstStep.title', {
          defaultMessage: 'Create visualizations',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.firstStep.description', {
          defaultMessage:
            'Build maps, charts, gauges, and other visualizations that best display your data.',
        }),
    },
    secondStep: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.secondStep.title', {
          defaultMessage: 'Add your style',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.secondStep.description', {
          defaultMessage: 'Customize your visualization to give your data its best look.',
        }),
    },
    thirdStep: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.thirdStep.title', {
          defaultMessage: 'Expand the time range',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.thirdStep.description', {
          defaultMessage:
            'View hits for a particular day, the last year, or whatever gets you the data you want.',
        }),
    },
    fourthStep: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.fourthStep.title', {
          defaultMessage: 'Filter the data',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.fourthStep.description', {
          defaultMessage:
            'To reduce the amount of data displayed, filter for data that exists, does not exist, contains a value, and more.',
        }),
    },
    fifthStep: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.fifthStep.title', {
          defaultMessage: 'Make it interactive',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.fifthStep.description', {
          defaultMessage: 'Add controls for a more engaging, more memorable experience.',
        }),
    },
  },
};
