import type { ComponentType, CSSProperties, ReactNode } from 'react';
import React from 'react';
import type { EuiPageSidebarProps } from '@elastic/eui';
import type { SolutionNavProps } from './solution_nav';
export interface TemplateProps {
    children?: ReactNode;
    pageSideBar?: ReactNode;
    pageSideBarProps?: EuiPageSidebarProps;
    style?: CSSProperties;
}
type Props<P> = P & TemplateProps & {
    solutionNav: SolutionNavProps;
};
export declare const withSolutionNav: <P extends TemplateProps>(WrappedComponent: ComponentType<P>) => {
    (props: Props<P>): React.JSX.Element;
    displayName: string;
};
export {};
