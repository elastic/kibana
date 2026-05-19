import React, { Component } from 'react';
import type { Capabilities, OverlayStart, NotificationsStart, ScopedHistory, HttpSetup, IUiSettingsClient, DocLinksStart, ThemeServiceStart } from '@kbn/core/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { SavedObjectWithMetadata } from '../../types';
export interface SavedObjectEditionProps {
    id: string;
    savedObjectType: string;
    http: HttpSetup;
    capabilities: Capabilities;
    overlays: OverlayStart;
    notifications: NotificationsStart;
    notFoundType?: string;
    history: ScopedHistory;
    uiSettings: IUiSettingsClient;
    docLinks: DocLinksStart['links'];
    settings: SettingsStart;
    theme: ThemeServiceStart;
}
export interface SavedObjectEditionState {
    type: string;
    object?: SavedObjectWithMetadata<any>;
}
export declare class SavedObjectEdition extends Component<SavedObjectEditionProps, SavedObjectEditionState> {
    constructor(props: SavedObjectEditionProps);
    componentDidMount(): void;
    canViewInApp(capabilities: Capabilities, obj?: SavedObjectWithMetadata<any>): boolean;
    render(): React.JSX.Element;
    delete(): Promise<void>;
    redirectToListing(): void;
}
