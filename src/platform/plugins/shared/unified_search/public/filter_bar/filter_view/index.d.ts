import type { FC } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FilterLabelStatus } from '../filter_item/filter_item';
interface Props {
    filter: Filter;
    readOnly: boolean;
    valueLabel: string;
    fieldLabel?: string;
    filterLabelStatus: FilterLabelStatus;
    errorMessage?: string;
    hideAlias?: boolean;
    [propName: string]: any;
    dataViews: DataView[];
}
export declare const FilterView: FC<Props>;
export {};
