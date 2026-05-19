import React, { Component } from 'react';
interface FilterBadgeErrorBoundaryProps {
}
interface FilterBadgeErrorBoundaryState {
    hasError: boolean;
}
export declare class FilterBadgeErrorBoundary extends Component<React.PropsWithChildren<FilterBadgeErrorBoundaryProps>, FilterBadgeErrorBoundaryState> {
    constructor(props: FilterBadgeErrorBoundaryProps);
    static getDerivedStateFromError(): {
        hasError: boolean;
    };
    componentWillReceiveProps(): void;
    render(): string | number | boolean | Iterable<React.ReactNode> | React.JSX.Element | null | undefined;
}
export {};
