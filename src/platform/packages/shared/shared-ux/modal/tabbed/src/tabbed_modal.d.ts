import React, { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { EuiModal, type EuiTabProps, type CommonProps } from '@elastic/eui';
import { type ITabDeclaration, type IDispatchFunction, type IModalContextProviderProps } from './context';
export type IModalTabContent<S> = (props: {
    state: S;
    dispatch: IDispatchFunction;
}) => ReactElement;
interface IModalTabActionBtn<S> extends CommonProps {
    id: string;
    dataTestSubj: string;
    label: string;
    handler: (args: {
        state: S;
    }) => void;
    isCopy?: boolean;
    style?: (args: {
        state: S;
    }) => boolean;
}
export interface IModalTabDeclaration<S = {}> extends EuiTabProps, ITabDeclaration<S> {
    description?: string;
    'data-test-subj'?: string;
    content: IModalTabContent<S>;
    modalActionBtn?: IModalTabActionBtn<S>;
}
export interface ITabbedModalInner extends Pick<ComponentProps<typeof EuiModal>, 'onClose' | 'outsideClickCloses'> {
    modalWidth?: number;
    modalTitle?: string;
    anchorElement?: HTMLElement;
    aboveTabsContent?: ReactNode;
    'data-test-subj'?: string;
}
export declare function TabbedModal<T extends Array<IModalTabDeclaration<any>>>({ tabs, defaultSelectedTabId, ...rest }: Omit<IModalContextProviderProps<T>, 'children'> & ITabbedModalInner): React.JSX.Element;
export {};
