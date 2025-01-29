/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '..';

export class MapsPage {
  readonly directNavigationOrigin = 'maps/map';

  constructor(private readonly page: ScoutPage) {}

  async gotoNewMap() {
    // see: https://github.com/elastic/kibana/pull/204607/files#r1932558888
    await this.page.gotoApp('maps/map');
  }
}
