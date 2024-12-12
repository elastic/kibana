/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const ESQL_CONTROL_TRIGGER = 'ESQL_CONTROL_TRIGGER';

export const esqlControlTrigger: Trigger = {
  id: ESQL_CONTROL_TRIGGER,
  title: i18n.translate('esql.triggers.esqlControlTigger', {
    defaultMessage: 'Create an ES|QL control',
  }),
  description: i18n.translate('esql.triggers.esqlControlTiggerDescription', {
    defaultMessage: 'Create an ES|QL control to interact with the charts',
  }),
};
