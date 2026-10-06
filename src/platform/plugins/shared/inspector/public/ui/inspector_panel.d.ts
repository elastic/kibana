import React, { Component } from 'react';
import type { InspectorViewDescription } from '../types';
import type { Adapters } from '../../common';
import type { InspectorKibanaServices } from '../views/requests/components/types';
interface InspectorPanelProps {
    adapters: Adapters;
    title?: string;
    options?: unknown;
    views: InspectorViewDescription[];
    dependencies: InspectorKibanaServices;
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
