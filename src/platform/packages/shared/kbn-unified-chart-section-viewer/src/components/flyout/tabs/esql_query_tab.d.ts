import React from 'react';
import type { ParsedMetricItem } from '../../../types';
interface EsqlQueryTabProps {
    esqlQuery?: string;
    metricItem: ParsedMetricItem;
}
export declare const EsqlQueryTab: ({ esqlQuery, metricItem }: EsqlQueryTabProps) => React.JSX.Element;
export {};
