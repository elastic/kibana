import React from 'react';
import type { DataViewBase, Query } from '@kbn/es-query';
import type { QueryInputServices } from '.';
export declare const defaultFilter: Query;
export interface FilterQueryInputProps {
    inputFilter: Query | undefined;
    onChange: (query: Query) => void;
    dataView: DataViewBase;
    helpMessage?: string | null;
    label?: string;
    initiallyOpen?: boolean;
    ['data-test-subj']?: string;
    queryInputServices: QueryInputServices;
    appName: string;
}
export declare function FilterQueryInput({ inputFilter, onChange, dataView, helpMessage, label, initiallyOpen, ['data-test-subj']: dataTestSubj, queryInputServices, appName, }: FilterQueryInputProps): React.JSX.Element;
