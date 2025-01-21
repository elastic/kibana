/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '@kbn/ui-actions-plugin/public';

export const CONTROL_HOVER_TRIGGER = 'CONTROL_HOVER_TRIGGER';
export const controlHoverTrigger: Trigger = {
  id: CONTROL_HOVER_TRIGGER,
  title: i18n.translate('controls.hoverTrigger.title', {
    defaultMessage: 'Control hover',
  }),
  description: i18n.translate('controls.hoverTrigger.description', {
    defaultMessage: "Add action to controls's hover menu",
  }),
};
