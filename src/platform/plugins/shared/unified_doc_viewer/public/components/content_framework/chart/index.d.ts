import React from 'react';
export interface ContentFrameworkChartProps {
    title: string;
    description?: string;
    esqlQuery?: string;
    children: React.ReactNode;
    'data-test-subj': string;
}
export declare function ContentFrameworkChart({ 'data-test-subj': contentFrameworkChartDataTestSubj, title, description, esqlQuery, children, }: ContentFrameworkChartProps): React.JSX.Element;
