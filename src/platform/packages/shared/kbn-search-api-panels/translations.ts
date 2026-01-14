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

export const EIS_CALLOUT_TITLE = i18n.translate('searchApiPanels.eisPromotion.callout.title', {
  defaultMessage: 'Elastic Inference Service',
});

export const EIS_PROMO_TOUR_TITLE = i18n.translate('searchApiPanels.eisPromotion.tour.title', {
  defaultMessage: 'Elastic Inference Service endpoints available',
});

export const EIS_CLOUD_CONNECT_PROMO_TOUR_TITLE = i18n.translate(
  'searchApiPanels.eisPromotion.cloudConnect.tour.title',
  {
    defaultMessage: 'Elastic Inference Service now available for self-managed clusters',
  }
);

export const EIS_COSTS_TOUR_TITLE = i18n.translate('searchApiPanels.eisCosts.tour.title', {
  defaultMessage: 'Elastic Inference Service (EIS) now available',
});

export const COSTS_TOUR_TITLE = i18n.translate('searchApiPanels.eisCosts.tour.title', {
  defaultMessage: 'Understanding inference costs',
});

export const EIS_UPDATE_CALLOUT_TITLE = i18n.translate('searchApiPanels.eisUpdate.callout.title', {
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

export const EIS_CLOUD_CONNECT_PROMO_DESCRIPTION = i18n.translate(
  'searchApiPanels.eisPromotion.cloudConnect.tour.description',
  {
    defaultMessage:
      'Connect your self-managed cluster to Elastic Cloud and use GPUs for inference tasks through the Elastic Inference Service.',
  }
);

export const EIS_COSTS_TOUR_DESCRIPTION = i18n.translate(
  'searchApiPanels.eisCosts.tour.description',
  {
    defaultMessage:
      'Performing inference, NLP tasks, and other ML activities on the Elastic Inference Service (EIS) incurs additional costs for tokens.',
  }
);

export const EIS_UPDATE_CALLOUT_DESCRIPTION = i18n.translate(
  'searchApiPanels.eisUpdate.callout.description',
  {
    defaultMessage:
      'Boost your vector search and AI workflows with the GPU-accelerated Elastic Inference Service (EIS), providing consistent low-latency, high throughput, and consumption-based pricing.',
  }
);

// CALL TO ACTIONS

export const EIS_CALLOUT_DOCUMENTATION_BTN = i18n.translate(
  'searchApiPanels.eisPromotion.callout.documentation.button',
  {
    defaultMessage: 'View documentation',
  }
);

export const TOUR_CTA = i18n.translate('searchApiPanels.eis.tour.cta', {
  defaultMessage: 'Learn more',
});

export const EIS_UPDATE_CALLOUT_CTA = i18n.translate('searchApiPanels.eisUpdate.callout.cta', {
  defaultMessage: 'Update to ELSER on EIS',
});
export const EIS_CLOUD_CONNECT_PROMO_TOUR_CTA = i18n.translate(
  'searchApiPanels.eisPromotion.cloudConnect.tour.cta',
  {
    defaultMessage: 'Connect your cluster',
  }
);

// DISMISS BUTTON

export const TOUR_DISMISS = i18n.translate('searchApiPanels.eis.tour.dismiss', {
  defaultMessage: 'Dismiss',
});

export const EIS_COSTS_TOUR_DISMISS_ARIA = i18n.translate(
  'searchApiPanels.eisCosts.tour.dismiss.aria',
  {
    defaultMessage: 'Close the Elastic Inference Service cost tour',
  }
);

export const COSTS_TOUR_DISMISS_ARIA = i18n.translate(
  'searchApiPanels.inferenceCosts.tour.dismiss.aria',
  {
    defaultMessage: 'Close the inference endpoints cost tour',
  }
);

export const EIS_CALLOUT_DISMISS_ARIA = i18n.translate(
  'searchApiPanels.eisPromotion.callout.dismiss.aria',
  {
    defaultMessage: 'Dismiss the Elastic Inference Service callout',
  }
);
