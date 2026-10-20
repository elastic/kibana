/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const TECH_PREVIEW_LABEL = i18n.translate(
  'alertsUIShared.connectorTypeCard.technicalPreviewBadgeLabel',
  { defaultMessage: 'Technical preview' }
);

export const TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'alertsUIShared.connectorTypeCard.technicalPreviewBadgeDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

export const DEPRECATED_LABEL = i18n.translate(
  'alertsUIShared.connectorTypeCard.deprecatedBadgeLabel',
  { defaultMessage: 'Deprecated' }
);

export const DEPRECATED_TOOLTIP_CONTENT = i18n.translate(
  'alertsUIShared.connectorTypeCard.deprecatedBadgeTooltip',
  { defaultMessage: 'This connector type is deprecated and may be removed in future versions.' }
);
