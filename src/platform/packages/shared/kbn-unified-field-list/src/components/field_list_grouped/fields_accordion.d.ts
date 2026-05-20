import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldsGroupNames } from '../../types';
import { type FieldListItem, type RenderFieldItemParams } from '../../types';
export interface FieldsAccordionProps<T extends FieldListItem> {
    initialIsOpen: boolean;
    onToggle: (open: boolean) => void;
    id: string;
    buttonId: string;
    label: string;
    helpTooltip?: string;
    hasLoaded: boolean;
    fieldsCount: number;
    hideDetails?: boolean;
    isFiltered: boolean;
    groupIndex: number;
    groupName: FieldsGroupNames;
    fieldSearchHighlight?: string;
    paginatedFields: T[];
    renderFieldItem: (params: RenderFieldItemParams<T>) => JSX.Element;
    renderCallout: () => JSX.Element;
    extraAction: React.ReactNode;
    showExistenceFetchError?: boolean;
    showExistenceFetchTimeout?: boolean;
}
declare function InnerFieldsAccordion<T extends FieldListItem = DataViewField>({ initialIsOpen, onToggle, id, buttonId, label, helpTooltip, hasLoaded, fieldsCount, hideDetails, isFiltered, groupIndex, groupName, fieldSearchHighlight, paginatedFields, renderFieldItem, renderCallout, showExistenceFetchError, showExistenceFetchTimeout, extraAction, }: FieldsAccordionProps<T>): React.JSX.Element;
export declare const FieldsAccordion: typeof InnerFieldsAccordion;
export declare const getFieldKey: (field: FieldListItem) => string;
export {};
