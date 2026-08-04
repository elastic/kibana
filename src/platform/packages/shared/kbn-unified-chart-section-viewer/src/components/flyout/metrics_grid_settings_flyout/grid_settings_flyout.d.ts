import React from 'react';
import type { MetricsGridSettings } from '@kbn/discover-utils';
interface GridSettingsFlyoutProps {
    gridSettings: MetricsGridSettings;
    onGridSettingsChange: (update: Partial<MetricsGridSettings>) => void;
    onClose: () => void;
}
export declare const GridSettingsFlyout: ({ gridSettings, onGridSettingsChange, onClose, }: GridSettingsFlyoutProps) => React.JSX.Element;
export {};
