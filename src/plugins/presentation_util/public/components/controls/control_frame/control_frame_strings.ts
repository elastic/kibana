/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ControlFrameStrings = {
  floatingActions: {
    getEditButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.floatingActions.editTitle', {
        defaultMessage: 'Manage control',
      }),
    getRemoveButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.floatingActions.removeTitle', {
        defaultMessage: 'Remove control',
      }),
  },
};
