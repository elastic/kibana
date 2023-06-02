/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition, throttle } from 'lodash';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, EuiSpacer } from '@elastic/eui';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { NoFieldsCallout } from './no_fields_callout';
import { FieldsAccordion, type FieldsAccordionProps, getFieldKey } from './fields_accordion';
import type { FieldListGroups, FieldListItem } from '../../types';
import { ExistenceFetchStatus, FieldsGroup, FieldsGroupNames } from '../../types';
import './field_list_grouped.scss';

const PAGINATION_SIZE = 50;
export const LOCAL_STORAGE_KEY_SECTIONS = 'unifiedFieldList.initiallyOpenSections';

type InitiallyOpenSections = Record<string, boolean>;

function getDisplayedFieldsLength<T extends FieldListItem>(
  fieldGroups: FieldListGroups<T>,
  accordionState: InitiallyOpenSections
) {
  return Object.entries(fieldGroups)
    .filter(([key]) => accordionState[key])
    .reduce((allFieldCount, [, { fields }]) => allFieldCount + fields.length, 0);
}

export interface FieldListGroupedProps<T extends FieldListItem> {
  fieldGroups: FieldListGroups<T>;
  fieldsExistenceStatus: ExistenceFetchStatus;
  fieldsExistInIndex: boolean;
  renderFieldItem: FieldsAccordionProps<T>['renderFieldItem'];
  scrollToTopResetCounter: number;
  screenReaderDescriptionId?: string;
  localStorageKeyPrefix?: string; // Your app name: "discover", "lens", etc. If not provided, sections state would not be persisted.
  'data-test-subj'?: string;
}

function InnerFieldListGrouped<T extends FieldListItem = DataViewField>({
  fieldGroups,
  fieldsExistenceStatus,
  fieldsExistInIndex,
  renderFieldItem,
  scrollToTopResetCounter,
  screenReaderDescriptionId,
  localStorageKeyPrefix,
  'data-test-subj': dataTestSubject = 'fieldListGrouped',
}: FieldListGroupedProps<T>) {
  const hasSyncedExistingFields =
    fieldsExistenceStatus && fieldsExistenceStatus !== ExistenceFetchStatus.unknown;

  const [fieldGroupsToShow, fieldGroupsToCollapse] = partition(
    Object.entries(fieldGroups),
    ([, { showInAccordion }]) => showInAccordion
  );
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const [storedInitiallyOpenSections, storeInitiallyOpenSections] =
    useLocalStorage<InitiallyOpenSections>(
      `${localStorageKeyPrefix ? localStorageKeyPrefix + '.' : ''}${LOCAL_STORAGE_KEY_SECTIONS}`,
      {}
    );
  const [accordionState, setAccordionState] = useState<InitiallyOpenSections>(() =>
    Object.fromEntries(
      fieldGroupsToShow.map(([key, { isInitiallyOpen }]) => {
        const storedInitiallyOpen = localStorageKeyPrefix
          ? storedInitiallyOpenSections?.[key]
          : null; // from localStorage
        return [
          key,
          typeof storedInitiallyOpen === 'boolean' ? storedInitiallyOpen : isInitiallyOpen,
        ];
      })
    )
  );

  useEffect(() => {
    // Reset the scroll if we have made material changes to the field list
    if (scrollContainer && scrollToTopResetCounter) {
      scrollContainer.scrollTop = 0;
      setPageSize(PAGINATION_SIZE);
    }
  }, [scrollToTopResetCounter, scrollContainer]);

  const lazyScroll = useCallback(() => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        setPageSize(
          Math.max(
            PAGINATION_SIZE,
            Math.min(
              pageSize + PAGINATION_SIZE * 0.5,
              getDisplayedFieldsLength<T>(fieldGroups, accordionState)
            )
          )
        );
      }
    }
  }, [scrollContainer, pageSize, setPageSize, fieldGroups, accordionState]);

  const paginatedFields = useMemo(() => {
    let remainingItems = pageSize;
    return Object.fromEntries(
      fieldGroupsToShow.map(([key, fieldGroup]) => {
        if (!accordionState[key] || remainingItems <= 0) {
          return [key, []];
        }
        const slicedFieldList = fieldGroup.fields.slice(0, remainingItems);
        remainingItems = remainingItems - slicedFieldList.length;
        return [key, slicedFieldList];
      })
    );
  }, [pageSize, fieldGroupsToShow, accordionState]);

  const hasSpecialFields = Boolean(fieldGroupsToCollapse[0]?.[1]?.fields?.length);

  return (
    <div
      className="unifiedFieldList__fieldListGrouped"
      data-test-subj={`${dataTestSubject}FieldGroups`}
      ref={(el) => {
        if (el && !el.dataset.dynamicScroll) {
          el.dataset.dynamicScroll = 'true';
          setScrollContainer(el);
        }
      }}
      onScroll={throttle(lazyScroll, 100)}
    >
      <div className="unifiedFieldList__fieldListGrouped__container">
        {Boolean(screenReaderDescriptionId) && (
          <EuiScreenReaderOnly>
            <div
              aria-live="polite"
              id={screenReaderDescriptionId}
              data-test-subj={`${dataTestSubject}__ariaDescription`}
            >
              {hasSyncedExistingFields
                ? [
                    shouldIncludeGroupDescriptionInAria(fieldGroups.SelectedFields) &&
                      i18n.translate(
                        'unifiedFieldList.fieldListGrouped.fieldSearchForSelectedFieldsLiveRegion',
                        {
                          defaultMessage:
                            '{selectedFields} selected {selectedFields, plural, one {field} other {fields}}.',
                          values: {
                            selectedFields: fieldGroups.SelectedFields?.fields?.length || 0,
                          },
                        }
                      ),
                    shouldIncludeGroupDescriptionInAria(fieldGroups.PopularFields) &&
                      i18n.translate(
                        'unifiedFieldList.fieldListGrouped.fieldSearchForPopularFieldsLiveRegion',
                        {
                          defaultMessage:
                            '{popularFields} popular {popularFields, plural, one {field} other {fields}}.',
                          values: {
                            popularFields: fieldGroups.PopularFields?.fields?.length || 0,
                          },
                        }
                      ),
                    fieldGroups.AvailableFields?.fields &&
                      i18n.translate(
                        'unifiedFieldList.fieldListGrouped.fieldSearchForAvailableFieldsLiveRegion',
                        {
                          defaultMessage:
                            '{availableFields} available {availableFields, plural, one {field} other {fields}}.',
                          values: {
                            availableFields: fieldGroups.AvailableFields.fields.length,
                          },
                        }
                      ),
                    shouldIncludeGroupDescriptionInAria(fieldGroups.UnmappedFields) &&
                      i18n.translate(
                        'unifiedFieldList.fieldListGrouped.fieldSearchForUnmappedFieldsLiveRegion',
                        {
                          defaultMessage:
                            '{unmappedFields} unmapped {unmappedFields, plural, one {field} other {fields}}.',
                          values: {
                            unmappedFields: fieldGroups.UnmappedFields?.fields?.length || 0,
                          },
                        }
                      ),
                    shouldIncludeGroupDescriptionInAria(fieldGroups.EmptyFields) &&
                      i18n.translate(
                        'unifiedFieldList.fieldListGrouped.fieldSearchForEmptyFieldsLiveRegion',
                        {
                          defaultMessage:
                            '{emptyFields} empty {emptyFields, plural, one {field} other {fields}}.',
                          values: {
                            emptyFields: fieldGroups.EmptyFields?.fields?.length || 0,
                          },
                        }
                      ),
                    shouldIncludeGroupDescriptionInAria(fieldGroups.MetaFields) &&
                      i18n.translate(
                        'unifiedFieldList.fieldListGrouped.fieldSearchForMetaFieldsLiveRegion',
                        {
                          defaultMessage:
                            '{metaFields} meta {metaFields, plural, one {field} other {fields}}.',
                          values: {
                            metaFields: fieldGroups.MetaFields?.fields?.length || 0,
                          },
                        }
                      ),
                  ]
                    .filter(Boolean)
                    .join(' ')
                : ''}
            </div>
          </EuiScreenReaderOnly>
        )}
        {hasSpecialFields && (
          <>
            <ul>
              {fieldGroupsToCollapse.flatMap(([key, { fields, fieldSearchHighlight }]) =>
                fields.map((field, index) => (
                  <Fragment key={getFieldKey(field)}>
                    {renderFieldItem({
                      field,
                      itemIndex: index,
                      groupIndex: 0,
                      groupName: key as FieldsGroupNames,
                      hideDetails: true,
                      fieldSearchHighlight,
                    })}
                  </Fragment>
                ))
              )}
            </ul>
            <EuiSpacer size="s" />
          </>
        )}
        {fieldGroupsToShow.map(([key, fieldGroup], index) => {
          const hidden = Boolean(fieldGroup.hideIfEmpty) && !fieldGroup.fields.length;
          if (hidden) {
            return null;
          }
          return (
            <Fragment key={key}>
              <FieldsAccordion<T>
                id={`${dataTestSubject}${key}`}
                initialIsOpen={Boolean(accordionState[key])}
                label={fieldGroup.title}
                helpTooltip={fieldGroup.helpText}
                hideDetails={fieldGroup.hideDetails}
                hasLoaded={hasSyncedExistingFields}
                fieldsCount={fieldGroup.fields.length}
                isFiltered={fieldGroup.fieldCount !== fieldGroup.fields.length}
                fieldSearchHighlight={fieldGroup.fieldSearchHighlight}
                paginatedFields={paginatedFields[key]}
                groupIndex={index + 1}
                groupName={key as FieldsGroupNames}
                onToggle={(open) => {
                  setAccordionState((s) => ({
                    ...s,
                    [key]: open,
                  }));
                  const displayedFieldLength = getDisplayedFieldsLength(fieldGroups, {
                    ...accordionState,
                    [key]: open,
                  });
                  setPageSize(
                    Math.max(
                      PAGINATION_SIZE,
                      Math.min(Math.ceil(pageSize * 1.5), displayedFieldLength)
                    )
                  );
                  if (localStorageKeyPrefix) {
                    storeInitiallyOpenSections({
                      ...storedInitiallyOpenSections,
                      [key]: open,
                    });
                  }
                }}
                showExistenceFetchError={fieldsExistenceStatus === ExistenceFetchStatus.failed}
                showExistenceFetchTimeout={fieldsExistenceStatus === ExistenceFetchStatus.failed} // TODO: deprecate timeout logic?
                renderCallout={() => (
                  <NoFieldsCallout
                    isAffectedByGlobalFilter={fieldGroup.isAffectedByGlobalFilter}
                    isAffectedByTimerange={fieldGroup.isAffectedByTimeFilter}
                    isAffectedByFieldFilter={fieldGroup.fieldCount !== fieldGroup.fields.length}
                    fieldsExistInIndex={!!fieldsExistInIndex}
                    defaultNoFieldsMessage={fieldGroup.defaultNoFieldsMessage}
                    data-test-subj={`${dataTestSubject}${key}NoFieldsCallout`}
                  />
                )}
                renderFieldItem={renderFieldItem}
              />
              <EuiSpacer size="m" />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export type GenericFieldListGrouped = typeof InnerFieldListGrouped;
const FieldListGrouped = React.memo(InnerFieldListGrouped) as GenericFieldListGrouped;

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldListGrouped;

function shouldIncludeGroupDescriptionInAria<T extends FieldListItem>(
  group: FieldsGroup<T> | undefined
): boolean {
  if (!group) {
    return false;
  }
  // has some fields or an empty list should be still shown
  return group.fields?.length > 0 || !group.hideIfEmpty;
}
