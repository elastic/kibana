import React, { Component } from 'react';
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/public';
import type { DocLinksStart, ToastsStart } from '@kbn/core/public';
type TelemetryService = TelemetryPluginSetup['telemetryService'];
interface Props {
    telemetryService: TelemetryService;
    showAppliesSettingMessage: boolean;
    enableSaving: boolean;
    toasts: ToastsStart;
    docLinks: DocLinksStart['links'];
}
interface State {
    processing: boolean;
    showExample: boolean;
    showSecurityExample: boolean;
    enabled: boolean;
}
export declare class TelemetryManagementSection extends Component<Props, State> {
    constructor(props: Props);
    render(): React.JSX.Element | null;
    maybeGetAppliesSettingMessage: () => React.JSX.Element | null;
    renderDescription: () => React.JSX.Element;
    toggleOptIn: () => Promise<boolean>;
    toggleExample: () => void;
}
export default TelemetryManagementSection;
