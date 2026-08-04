import React from 'react';
import type { FieldStatisticsTableProps } from './types';
type FieldStatisticsTabProps = Omit<FieldStatisticsTableProps, 'query' | 'filters'>;
export declare const FieldStatisticsTab: React.FC<FieldStatisticsTabProps>;
export {};
