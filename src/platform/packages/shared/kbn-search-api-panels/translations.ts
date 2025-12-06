/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

// TITLES

export const EIS_PROMO_CALLOUT_TITLE = i18n.translate(
  'searchApiPanels.eisPromotion.callout.title',
  {
    defaultMessage: 'Elastic Inference Service',
  }
);

export const EIS_PROMO_TOUR_TITLE = i18n.translate('searchApiPanels.eisPromotion.tour.title', {
  defaultMessage: 'Elastic Inference Service endpoints available',
});

export const EIS_COSTS_TOUR_TITLE = i18n.translate('searchApiPanels.eisCosts.tour.title', {
  defaultMessage: 'Elastic Inference Service (EIS) now available',
});

// DESCRIPTIONS

export const EIS_PROMO_CALLOUT_DESCRIPTION = i18n.translate(
  'searchApiPanels.eisPromotion.callout.description',
  {
    defaultMessage:
      'Tap into AI-powered search and chat—no ML model deployment or management needed.',
  }
);

export const EIS_PROMO_TOUR_DESCRIPTION = i18n.translate(
  'searchApiPanels.eisPromotion.tour.description',
  {
    defaultMessage: 'Use GPUs for inference tasks through the Elastic Inference Service endpoints.',
  }
);

export const EIS_COSTS_TOUR_DESCRIPTION = i18n.translate(
  'searchApiPanels.eisCosts.tour.description',
  {
    defaultMessage:
      'Performing inference, NLP tasks, and other ML activities on the Elastic Inference Service (EIS) incurs additional costs for tokens.',
  }
);

// CALL TO ACTIONS

export const EIS_PROMO_CALLOUT_CTA = i18n.translate('searchApiPanels.eisPromotion.callout.cta', {
  defaultMessage: 'Get started',
});

export const EIS_TOUR_CTA = i18n.translate('searchApiPanels.eis.tour.cta', {
  defaultMessage: 'Learn more',
});

// DISMISS BUTTON

export const EIS_TOUR_DISMISS = i18n.translate('searchApiPanels.eis.tour.dismiss', {
  defaultMessage: 'Dismiss',
});

export const EIS_COSTS_TOUR_DISMISS_ARIA = i18n.translate(
  'searchApiPanels.eisCosts.tour.dismiss.aria',
  {
    defaultMessage: 'Close the cost tour',
  }
);

// ICON ALT TAGS

export const EIS_PROMO_CALLOUT_ICON_ALT = i18n.translate(
  'searchApiPanels.eisPromotion.callout.icon.alt',
  {
    defaultMessage: 'EIS promotional banner icon',
  }
);
