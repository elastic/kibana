import type { Filter } from '@kbn/es-query';
import type { FC } from 'react';
import React from 'react';
interface QueryDslFilter {
    queryDsl: string;
    customLabel: string | null;
}
interface OriginalFilter {
    filter: Filter;
    queryDslFilter: QueryDslFilter;
}
type ChangedFilter = Filter | QueryDslFilter;
export interface WithCloseFilterEditorConfirmModalProps {
    onCloseFilterPopover: (actions?: Action[]) => void;
    onLocalFilterCreate: (filter: OriginalFilter) => void;
    onLocalFilterUpdate: (filter: ChangedFilter) => void;
}
type Action = () => void;
export declare function withCloseFilterEditorConfirmModal<T extends WithCloseFilterEditorConfirmModalProps = WithCloseFilterEditorConfirmModalProps>(WrappedComponent: FC<T>): (props: Omit<T, keyof WithCloseFilterEditorConfirmModalProps>) => React.JSX.Element;
export {};
