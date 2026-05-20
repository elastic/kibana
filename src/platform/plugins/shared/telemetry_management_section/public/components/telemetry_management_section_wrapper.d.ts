import React from 'react';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';
import type { DocLinksStart } from '@kbn/core/public';
import type { RegistryComponentProps } from '@kbn/management-settings-section-registry';
import type TelemetryManagementSection from './telemetry_management_section';
export type TelemetryManagementSectionWrapperProps = Omit<TelemetryManagementSection['props'], 'telemetryService' | 'showAppliesSettingMessage' | 'docLinks'>;
export declare function telemetryManagementSectionWrapper(telemetryService: TelemetryPluginSetup['telemetryService'], docLinks: DocLinksStart['links']): ({ enableSaving, ...props }: RegistryComponentProps) => React.JSX.Element;
