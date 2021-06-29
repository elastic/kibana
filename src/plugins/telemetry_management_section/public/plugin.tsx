/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
import type { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import type { Plugin, CoreStart, CoreSetup } from 'src/core/public';

import {
  telemetryManagementSectionWrapper,
  TelemetryManagementSectionWrapperProps,
} from './components/telemetry_management_section_wrapper';

export interface TelemetryPluginConfig {
  enabled: boolean;
  url: string;
  banner: boolean;
  allowChangingOptInStatus: boolean;
  optIn: boolean | null;
  optInStatusUrl: string;
  sendUsageFrom: 'browser' | 'server';
  telemetryNotifyUserAboutOptInDefault?: boolean;
}

export interface TelemetryManagementSectionPluginDepsSetup {
  telemetry: TelemetryPluginSetup;
  advancedSettings: AdvancedSettingsSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface TelemetryManagementSectionPluginSetup {
  toggleSecuritySolutionExample: (enabled: boolean) => void;
}

export class TelemetryManagementSectionPlugin
  implements Plugin<TelemetryManagementSectionPluginSetup> {
  private showSecuritySolutionExample = false;
  private shouldShowSecuritySolutionExample = () => {
    return this.showSecuritySolutionExample;
  };

  public setup(
    core: CoreSetup,
    {
      advancedSettings,
      telemetry: { telemetryService },
      usageCollection,
    }: TelemetryManagementSectionPluginDepsSetup
  ) {
    const ApplicationUsageTrackingProvider =
      usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
    advancedSettings.component.register(
      advancedSettings.component.componentType.PAGE_FOOTER_COMPONENT,
      (props) => {
        return (
          <ApplicationUsageTrackingProvider>
            {telemetryManagementSectionWrapper(
              telemetryService,
              this.shouldShowSecuritySolutionExample
            )(props as TelemetryManagementSectionWrapperProps)}
          </ApplicationUsageTrackingProvider>
        );
      },
      true
    );

    return {
      toggleSecuritySolutionExample: (enabled: boolean) => {
        this.showSecuritySolutionExample = enabled;
      },
    };
  }

  public start(core: CoreStart) {}
}
