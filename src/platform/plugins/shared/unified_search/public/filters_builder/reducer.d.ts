import type { Reducer } from 'react';
import type { Filter, BooleanRelation } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Operator } from '../filter_bar/filter_editor';
import type { FilterLocation } from './types';
/** @internal **/
export interface FiltersBuilderState {
    filters: Filter[];
}
/** @internal **/
export interface UpdateFiltersPayload {
    filters: Filter[];
}
/** @internal **/
export interface AddFilterPayload {
    dest: FilterLocation;
    filter: Filter;
    booleanRelation: BooleanRelation;
    dataView: DataView;
}
/** @internal **/
export interface UpdateFilterPayload {
    dest: FilterLocation;
    field?: DataViewField;
    operator?: Operator;
    params?: Filter['meta']['params'];
}
/** @internal **/
export interface RemoveFilterPayload {
    dest: FilterLocation;
}
/** @internal **/
export interface MoveFilterPayload {
    from: FilterLocation;
    to: FilterLocation;
    booleanRelation: BooleanRelation;
    dataView: DataView;
}
/** @internal **/
export type FiltersBuilderActions = {
    type: 'updateFilters';
    payload: UpdateFiltersPayload;
} | {
    type: 'addFilter';
    payload: AddFilterPayload;
} | {
    type: 'removeFilter';
    payload: RemoveFilterPayload;
} | {
    type: 'moveFilter';
    payload: MoveFilterPayload;
} | {
    type: 'updateFilter';
    payload: UpdateFilterPayload;
};
export declare const FiltersBuilderReducer: Reducer<FiltersBuilderState, FiltersBuilderActions>;
