/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ActionGroup } from './action_group_types';

export const RecoveredActionGroup: Readonly<ActionGroup<'recovered'>> = Object.freeze({
  id: 'recovered',
  name: i18n.translate('alertingTypes.builtinActionGroups.recovered', {
    defaultMessage: 'Recovered',
  }),
});

export type DefaultActionGroupId = 'default';

export type RecoveredActionGroupId = (typeof RecoveredActionGroup)['id'];
