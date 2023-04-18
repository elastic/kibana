/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

export interface SetupDeps {
  contentManagement: ContentManagementPublicSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDeps {
  contentManagement: ContentManagementPublicStart;
}
