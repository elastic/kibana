/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { AdvancedSettingsSetup } from '@kbn/advanced-settings-plugin/public';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { CoreStart, CoreSetup, DocLinksStart } from '@kbn/core/public';

import { telemetryManagementSectionWrapper } from './components/telemetry_management_section_wrapper';
import { SEARCH_TERMS } from '../common';

export interface TelemetryManagementSectionPluginDepsSetup {
  telemetry: TelemetryPluginSetup;
  advancedSettings: AdvancedSettingsSetup;
  usageCollection?: UsageCollectionSetup;
}

export class TelemetryManagementSectionPlugin {
  public setup(
    core: CoreSetup,
    {
      advancedSettings,
      telemetry: { telemetryService },
      usageCollection,
    }: TelemetryManagementSectionPluginDepsSetup
  ) {
    let docLinksLinks: DocLinksStart['links'];

    core.getStartServices().then(([{ docLinks }]) => {
      docLinksLinks = docLinks?.links;
    });

    const ApplicationUsageTrackingProvider =
      usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

    const queryMatch = (query: string) => {
      const searchTerm = query.toLowerCase();
      return (
        telemetryService.getCanChangeOptInStatus() &&
        SEARCH_TERMS.some((term) => term.indexOf(searchTerm) >= 0)
      );
    };

    advancedSettings.addGlobalSection((props) => {
      return (
        <ApplicationUsageTrackingProvider>
          {telemetryManagementSectionWrapper(telemetryService, docLinksLinks)(props)}
        </ApplicationUsageTrackingProvider>
      );
    }, queryMatch);

    return {};
  }

  public start(core: CoreStart) {}
}
