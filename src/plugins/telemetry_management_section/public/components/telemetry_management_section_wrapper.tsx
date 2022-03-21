/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
import { DocLinksStart } from 'kibana/public';
import type TelemetryManagementSection from './telemetry_management_section';

export type TelemetryManagementSectionWrapperProps = Omit<
  TelemetryManagementSection['props'],
  'telemetryService' | 'showAppliesSettingMessage' | 'docLinks'
>;

const TelemetryManagementSectionComponent = lazy(() => import('./telemetry_management_section'));

export function telemetryManagementSectionWrapper(
  telemetryService: TelemetryPluginSetup['telemetryService'],
  docLinks: DocLinksStart['links']
) {
  const TelemetryManagementSectionWrapper = (props: TelemetryManagementSectionWrapperProps) => (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <TelemetryManagementSectionComponent
        showAppliesSettingMessage={true}
        telemetryService={telemetryService}
        docLinks={docLinks}
        {...props}
      />
    </Suspense>
  );

  return TelemetryManagementSectionWrapper;
}
