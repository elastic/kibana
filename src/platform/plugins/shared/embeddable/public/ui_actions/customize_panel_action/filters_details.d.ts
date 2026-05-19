import React from 'react';
import type { CustomizePanelActionApi } from './customize_panel_action';
export declare const filterDetailsActionStrings: {
    getQueryTitle: () => string;
    getFiltersTitle: () => string;
};
interface FiltersDetailsProps {
    editMode: boolean;
    api: CustomizePanelActionApi;
}
export declare function FiltersDetails({ editMode, api }: FiltersDetailsProps): React.JSX.Element;
export {};
