import React, { Component } from 'react';
import type { ChromeBreadcrumb, AppMountParameters, ScopedHistory, ThemeServiceStart } from '@kbn/core/public';
import type { ManagementApp } from '../../utils';
interface ManagementSectionWrapperProps {
    app: ManagementApp;
    setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], history?: ScopedHistory) => void;
    onAppMounted: (id: string) => void;
    history: AppMountParameters['history'];
    theme: ThemeServiceStart;
}
interface ManagementSectionWrapperState {
    error: Error | null;
}
export declare class ManagementAppWrapper extends Component<ManagementSectionWrapperProps, ManagementSectionWrapperState> {
    private unmount?;
    private mountElementRef;
    constructor(props: ManagementSectionWrapperProps);
    componentDidMount(): void;
    componentWillUnmount(): Promise<void>;
    render(): React.JSX.Element;
}
export {};
