import React, { Component } from 'react';
import type { InspectorViewDescription } from '../types';
interface Props {
    views: InspectorViewDescription[];
    onViewSelected: (view: InspectorViewDescription) => void;
    selectedView: InspectorViewDescription;
}
interface State {
    isSelectorOpen: boolean;
}
export declare class InspectorViewChooser extends Component<Props, State> {
    state: State;
    toggleSelector: () => void;
    closeSelector: () => void;
    renderView: (view: InspectorViewDescription, index: number) => React.JSX.Element;
    renderViewButton(): React.JSX.Element;
    renderSingleView(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
