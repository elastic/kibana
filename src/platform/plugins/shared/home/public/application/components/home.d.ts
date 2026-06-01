import React, { Component } from 'react';
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../services';
export declare const KEY_ENABLE_WELCOME = "home:welcome:show";
export interface HomeProps {
    addBasePath: (url: string) => string;
    directories: FeatureCatalogueEntry[];
    solutions: FeatureCatalogueSolution[];
    localStorage: Storage;
    urlBasePath: string;
    hasUserDataView: () => Promise<boolean>;
    isCloudEnabled: boolean;
}
interface State {
    isLoading: boolean;
    isNewKibanaInstance: boolean;
    isWelcomeEnabled: boolean;
}
export declare class Home extends Component<HomeProps, State> {
    private _isMounted;
    constructor(props: HomeProps);
    componentWillUnmount(): void;
    componentDidMount(): void;
    private fetchIsNewKibanaInstance;
    private endLoading;
    skipWelcome(): void;
    private findDirectoryById;
    private getFeaturesByCategory;
    private renderNormal;
    private renderLoading;
    private renderWelcome;
    render(): string | React.JSX.Element;
}
export {};
