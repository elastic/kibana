import React from 'react';
/**
 * Renders nothing instead of a component which triggered an exception.
 */
export declare class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, {
    hasError: boolean;
}> {
    constructor(props: {});
    static getDerivedStateFromError(): {
        hasError: boolean;
    };
    render(): React.ReactNode;
}
