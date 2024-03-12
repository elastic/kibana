/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const IMAGE_CLICK_TRIGGER = 'IMAGE_CLICK_TRIGGER';

export const imageClickTrigger: Trigger = {
  id: IMAGE_CLICK_TRIGGER,
  title: i18n.translate('imageEmbeddable.triggers.imageClickTriggerTitle', {
    defaultMessage: 'Image click',
  }),
  description: i18n.translate('imageEmbeddable.triggers.imageClickDescription', {
    defaultMessage: 'Clicking the image will trigger the action',
  }),
};
