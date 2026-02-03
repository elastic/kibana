/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APPLY_FILTER_TRIGGER } from "@kbn/data-plugin/public";
import { DrilldownDefinition } from "@kbn/embeddable-plugin/public";
import { IMAGE_CLICK_TRIGGER } from '@kbn/image-embeddable-plugin/public';

export const dashboardDrilldown: DrilldownDefinition = {
  execute: async (drilldownState: DashboardDrilldownConfig, context: EmbeddableApiContext) => {
    /*if (config.open_in_new_tab) {
      window.open(await this.getHref(config, context), '_blank');
    } else {
      const { app, path, state } = await this.getLocation(config, context, false);
      await this.params.start().core.application.navigateToApp(app, { path, state });
    }*/
  },
  supportedTriggers: [APPLY_FILTER_TRIGGER, IMAGE_CLICK_TRIGGER],
};