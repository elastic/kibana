import React, { Component } from 'react';
import type { ApplicationStart, HttpStart, IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { InspectorViewDescription } from '../types';
import type { Adapters } from '../../common';
interface InspectorPanelProps {
    adapters: Adapters;
    title?: string;
    options?: unknown;
    views: InspectorViewDescription[];
    dependencies: {
        application: ApplicationStart;
        http: HttpStart;
        uiSettings: IUiSettingsClient;
        share: SharePluginStart;
        settings: SettingsStart;
        theme: ThemeServiceStart;
    };
}
interface InspectorPanelState {
    selectedView: InspectorViewDescription;
    views: InspectorViewDescription[];
    adapters: Adapters;
}
export declare class InspectorPanel extends Component<InspectorPanelProps, InspectorPanelState> {
    static defaultProps: {
        title: string;
    };
    state: InspectorPanelState;
    static getDerivedStateFromProps(nextProps: InspectorPanelProps, prevState: InspectorPanelState): {
        views: InspectorViewDescription[];
        selectedView: InspectorViewDescription;
    };
    onViewSelected: (view: InspectorViewDescription) => void;
    renderSelectedPanel(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
