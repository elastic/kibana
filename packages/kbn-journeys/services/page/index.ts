/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Page } from '@playwright/test';
import { Retry } from '..';
import { KibanaPage } from './kibana_page';
import { ProjectPage } from './project_page';

export function getNewPageObject(isServerless: boolean, page: Page, log: ToolingLog, retry: Retry) {
  return isServerless ? new ProjectPage(page, log, retry) : new KibanaPage(page, log, retry);
}
