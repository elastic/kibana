/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
        defaultMessage: 'Start editing here.',
      }),
  },
  editModeTour: {
    getTitle: () =>
      i18n.translate('dashboard.tour.editMode.title', {
        defaultMessage: 'Dashboard tour',
      }),
    createVisualization: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.createVisualization.title', {
          defaultMessage: 'Create visualizations',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.createVisualization.description', {
          defaultMessage:
            'Build maps, charts, gauges, and other visualizations that best display your data.',
        }),
    },
    panelOptions: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.panelOptions.title', {
          defaultMessage: 'Add your style',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.panelOptions.description', {
          defaultMessage: 'Customize your visualization to give your data its best look.',
        }),
    },
    timePicker: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.timePicker.title', {
          defaultMessage: 'Expand the time range',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.timePicker.description', {
          defaultMessage:
            'View hits for a particular day, the last year, or whatever gets you the data you want.',
        }),
    },
    filters: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.addFilter.title', {
          defaultMessage: 'Filter the data',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.addFilter.description', {
          defaultMessage:
            'To reduce the amount of data displayed, filter for data that exists, does not exist, contains a value, and more.',
        }),
    },
    controls: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.controls.title', {
          defaultMessage: 'Make it interactive',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.controls.description', {
          defaultMessage: 'Add controls for a more engaging, more memorable experience.',
        }),
    },
  },
};
