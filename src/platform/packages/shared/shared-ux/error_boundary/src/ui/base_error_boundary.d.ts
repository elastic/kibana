import React from 'react';
import type { KibanaErrorBoundaryServices } from '../../types';
export interface BaseErrorBoundaryProps {
    services: KibanaErrorBoundaryServices;
}
export interface BaseErrorBoundaryState {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    componentName: string | null;
    isFatal: boolean | null;
    errorId?: string;
}
/**
 * Base error boundary component for error handling
 * Subclasses must implement their own componentDidCatch and error reporting
 */
export declare abstract class BaseErrorBoundary<P extends BaseErrorBoundaryProps, S extends BaseErrorBoundaryState> extends React.Component<P, S> {
    private beforeUnloadHandler;
    componentDidMount(): void;
    /**
     * Clean up event listeners when component unmounts
     */
    componentWillUnmount(): void;
    /**
     * Render method must be implemented by extending classes
     */
    abstract render(): React.ReactNode;
}
