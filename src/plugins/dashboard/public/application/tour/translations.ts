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
        defaultMessage: 'Ready to create beautiful visualizations?',
      }),
    getDescription: () =>
      i18n.translate('dashboard.tour.viewMode.firstStep.description', {
        defaultMessage: 'Open your dashboard in Edit mode here.',
      }),
  },
  editModeTour: {
    createVisualization: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.createVisualization.title', {
          defaultMessage: 'Get creative',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.createVisualization.description', {
          defaultMessage:
            'Create charts, maps, and other visualizations that best display your data.',
        }),
    },
    panelOptions: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.panelOptions.title', {
          defaultMessage: 'Add your style',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.panelOptions.description', {
          defaultMessage: 'Customize your visualization to add a personal touch.',
        }),
    },
    timePicker: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.timePicker.title', {
          defaultMessage: 'Adjust the time range',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.timePicker.description', {
          defaultMessage:
            'View data for a particular day, the last year, or whatever time range you want.',
        }),
    },
    filters: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.addFilter.title', {
          defaultMessage: 'Refine your data',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.addFilter.description', {
          defaultMessage: 'Filter for only the data you want to explore.',
        }),
    },
    controls: {
      getTitle: () =>
        i18n.translate('dashboard.tour.editMode.controls.title', {
          defaultMessage: 'Make it interactive',
        }),
      getDescription: () =>
        i18n.translate('dashboard.tour.editMode.controls.description', {
          defaultMessage: 'Add Controls, or custom filters, for a more engaging experience.',
        }),
    },
  },
};
