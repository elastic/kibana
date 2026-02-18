/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import React from 'react';
import { commonCustomTriggerDefinition } from '../../common/triggers/custom_trigger';

export const customTriggerPublicDefinition: PublicTriggerDefinition = {
  ...commonCustomTriggerDefinition,
  title: i18n.translate('workflowsExtensionsExample.customTrigger.title', {
    defaultMessage: 'Custom trigger',
  }),
  description: i18n.translate('workflowsExtensionsExample.customTrigger.description', {
    defaultMessage:
      'Emitted when a custom event occurs. Used by the workflows extensions example plugin.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/star').then(({ icon }) => ({ default: icon }))
  ),
};
