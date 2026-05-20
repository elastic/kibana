import React from 'react';
export interface ChartContainerProps {
    hasData: boolean;
    loading: boolean;
    hasError: boolean;
    height: number;
    children: React.ReactNode;
    id?: string;
}
export declare function ChartContainer({ children, height, hasData, id, loading, hasError, }: ChartContainerProps): React.JSX.Element;
