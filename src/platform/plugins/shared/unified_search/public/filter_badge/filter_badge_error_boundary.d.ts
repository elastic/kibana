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
    render(): string | number | boolean | React.JSX.Element | Iterable<React.ReactNode> | null | undefined;
}
export {};
