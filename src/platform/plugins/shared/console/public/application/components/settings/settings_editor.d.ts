import React from 'react';
import type { DevToolsSettings } from '../../../services';
import type { EsHostService } from '../../lib';
export interface Props {
    onSaveSettings: (newSettings: DevToolsSettings) => void;
    refreshAutocompleteSettings: (selectedSettings: DevToolsSettings['autocomplete']) => void;
    settings: DevToolsSettings;
    esHostService: EsHostService;
}
export declare const SettingsEditor: (props: Props) => React.JSX.Element;
