import React from 'react';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export declare const EventAnnotationGroupSavedObjectFinder: ({ contentClient, uiSettings, fixedPageSize, checkHasAnnotationGroups, onChoose, onCreateNew, }: {
    uiSettings: IUiSettingsClient;
    contentClient: ContentClient;
    fixedPageSize?: number;
    checkHasAnnotationGroups: () => Promise<boolean>;
    onChoose: (value: {
        id: string;
        type: string;
        fullName: string;
        savedObject: SavedObjectCommon;
    }) => void;
    onCreateNew: () => void;
}) => React.JSX.Element;
