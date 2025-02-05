/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout';
import { OnboardingHomePage } from './onboarding_home';
import { CustomLogsPage } from './custom_logs';

export interface ObltPageObjects extends PageObjects {
  onboardingHome: OnboardingHomePage;
  customLogs: CustomLogsPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): ObltPageObjects {
  return {
    ...pageObjects,
    onboardingHome: createLazyPageObject(OnboardingHomePage, page),
    customLogs: createLazyPageObject(CustomLogsPage, page),
  };
}
