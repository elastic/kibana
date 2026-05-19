import type { DataView } from '@kbn/data-views-plugin/public';
import type { GenericIndexPatternColumn } from '@kbn/lens-common';
import type { LensBreakdownConfig } from '../types';
export declare const getBreakdownColumn: ({ options, dataView, }: {
    options: LensBreakdownConfig;
    dataView: DataView;
}) => GenericIndexPatternColumn;
