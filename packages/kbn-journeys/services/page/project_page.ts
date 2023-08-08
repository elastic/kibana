/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { subj } from '@kbn/test-subj-selector';
import { KibanaPage } from './kibana_page';

export class ProjectPage extends KibanaPage {
  async waitForHeader() {
    return this.page.waitForSelector(subj('kibanaProjectHeader'), {
      state: 'attached',
    });
  }

  async backToDashboardListing() {
    await this.page.click(subj('nav-item-search_project_nav.explore.dashboards'));
  }
}
