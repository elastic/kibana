/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export class IncompatibleActionError extends Error {
  code = 'INCOMPATIBLE_ACTION';

  constructor() {
    super(
      i18n.translate('uiActions.errors.incompatibleAction', {
        defaultMessage: 'Action is incompatible',
      })
    );
  }
}
