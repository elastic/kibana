/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreStart } from '@kbn/core/public';
import { setKibanaServices } from './kibana_services';

export class TextBasedLanguagesPlugin implements Plugin<{}, void> {
  public setup() {
    return {};
  }

  public start(core: CoreStart): void {
    setKibanaServices(core);
  }

  public stop() {}
}
