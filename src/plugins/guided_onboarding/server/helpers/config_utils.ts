/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GuideId } from '@kbn/guided-onboarding';
import { GuideConfig } from '../../common/types';
import { guidesConfig } from './guides_config';

export const getGuideConfig = (guideId?: GuideId): GuideConfig | undefined => {
  if (guideId && Object.keys(guidesConfig).includes(guideId)) {
    return guidesConfig[guideId];
  }
};
