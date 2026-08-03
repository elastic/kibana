import React from 'react';
import type { FC } from 'react';
import type { Services } from '../services';
import type { Item } from '../types';
import type { CustomValidators } from './use_metadata_form';
export interface Props {
    item: Item;
    entityName: string;
    flyoutTitle: string;
    flyoutTitleId: string;
    isReadonly?: boolean;
    readonlyReason?: string;
    services: Pick<Services, 'TagSelector' | 'TagList' | 'notifyError'>;
    onSave?: (args: {
        id: string;
        title: string;
        description?: string;
        tags: string[];
    }) => Promise<void>;
    customValidators?: CustomValidators;
    appendRows?: React.ReactNode;
}
export declare const ContentEditorFlyoutContent: FC<Props>;
