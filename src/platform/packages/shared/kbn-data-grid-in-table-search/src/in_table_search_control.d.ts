import React from 'react';
import { type SerializedStyles } from '@emotion/react';
import type { UseFindMatchesProps } from './types';
export interface InTableSearchControlProps extends Omit<UseFindMatchesProps, 'onScrollToActiveMatch'> {
    pageSize: number | null;
    getColumnIndexFromId: (columnId: string) => number;
    scrollToCell: (params: {
        rowIndex: number;
        columnIndex: number;
        align: 'center';
    }) => void;
    shouldOverrideCmdF: (element: HTMLElement) => boolean;
    onChange: (searchTerm: string | undefined) => void;
    onChangeCss: (styles: SerializedStyles) => void;
    onChangeToExpectedPage: (pageIndex: number) => void;
}
export declare const InTableSearchControl: React.FC<InTableSearchControlProps>;
