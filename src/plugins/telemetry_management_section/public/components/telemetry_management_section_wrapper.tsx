/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
// It should be this but the types are way too vague in the AdvancedSettings plugin `Record<string, any>`
// type Props = Omit<TelemetryManagementSection['props'], 'telemetryService'>;
type Props = any;

const TelemetryManagementSectionComponent = lazy(() => import('./telemetry_management_section'));

export function telemetryManagementSectionWrapper(
  telemetryService: TelemetryPluginSetup['telemetryService'],
  shouldShowSecuritySolutionUsageExample: () => boolean
) {
  const TelemetryManagementSectionWrapper = (props: Props) => (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <TelemetryManagementSectionComponent
        showAppliesSettingMessage={true}
        telemetryService={telemetryService}
        isSecurityExampleEnabled={shouldShowSecuritySolutionUsageExample}
        {...props}
      />
    </Suspense>
  );

  return TelemetryManagementSectionWrapper;
}
