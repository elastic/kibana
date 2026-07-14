import React from 'react';
import type { AppHeaderEditableTitle } from '../../types';
export declare const isEditableTitle: (title: string | AppHeaderEditableTitle) => title is AppHeaderEditableTitle;
interface TitleProps {
    title: string | AppHeaderEditableTitle;
    titleOffset?: boolean;
    size?: 'xs' | 's';
}
export declare const Title: React.NamedExoticComponent<TitleProps>;
export {};
