import React from 'react';
import type { AppHeaderBack, AppHeaderEditableTitle } from '../../types';
export interface TitleAreaProps {
    title?: string | AppHeaderEditableTitle;
    back?: AppHeaderBack | AppHeaderBack[];
    size?: 'xs' | 's';
}
export declare const TitleArea: React.NamedExoticComponent<TitleAreaProps>;
