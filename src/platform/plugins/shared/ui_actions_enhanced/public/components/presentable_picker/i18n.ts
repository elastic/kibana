/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const txtBetaActionFactoryLabel = i18n.translate(
  'uiActionsEnhanced.components.actionWizard.betaActionLabel',
  {
    defaultMessage: `Beta`,
  }
);

export const txtBetaActionFactoryTooltip = i18n.translate(
  'uiActionsEnhanced.components.actionWizard.betaActionTooltip',
  {
    defaultMessage: `This action is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features. Please help us by reporting bugs or providing other feedback.`,
  }
);

export const txtInsufficientLicenseLevel = i18n.translate(
  'uiActionsEnhanced.components.actionWizard.insufficientLicenseLevelTooltip',
  {
    defaultMessage: 'Insufficient license level',
  }
);
