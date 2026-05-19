import React from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldsAccordionProps } from './fields_accordion';
import type { FieldListGroups, FieldListItem } from '../../types';
import { ExistenceFetchStatus } from '../../types';
export declare const LOCAL_STORAGE_KEY_SECTIONS = "unifiedFieldList.initiallyOpenSections";
export interface FieldListGroupedProps<T extends FieldListItem> {
    fieldGroups: FieldListGroups<T>;
    fieldsExistenceStatus: ExistenceFetchStatus;
    fieldsExistInIndex: boolean;
    renderFieldItem: FieldsAccordionProps<T>['renderFieldItem'];
    scrollToTopResetCounter: number;
    screenReaderDescriptionId?: string;
    localStorageKeyPrefix?: string;
    muteScreenReader?: boolean;
    'data-test-subj'?: string;
}
declare function InnerFieldListGrouped<T extends FieldListItem = DataViewField>({ fieldGroups, fieldsExistenceStatus, fieldsExistInIndex, renderFieldItem, scrollToTopResetCounter, screenReaderDescriptionId, muteScreenReader, localStorageKeyPrefix, 'data-test-subj': dataTestSubject, }: FieldListGroupedProps<T>): React.JSX.Element;
export type GenericFieldListGrouped = typeof InnerFieldListGrouped;
declare const FieldListGrouped: GenericFieldListGrouped;
export default FieldListGrouped;
