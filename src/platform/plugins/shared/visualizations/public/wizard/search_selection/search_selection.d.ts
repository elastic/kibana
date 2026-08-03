import React from 'react';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { BaseVisType } from '../../vis_types';
interface SearchSelectionProps {
    contentClient: ContentClient;
    uiSettings: IUiSettingsClient;
    onSearchSelected: (searchId: string, searchType: string) => void;
    visType: BaseVisType;
    goBack: () => void;
}
export declare class SearchSelection extends React.Component<SearchSelectionProps> {
    private fixedPageSize;
    render(): React.JSX.Element;
}
export {};
