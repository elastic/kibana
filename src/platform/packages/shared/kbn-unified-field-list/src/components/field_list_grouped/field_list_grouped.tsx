/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { partition, throttle } from 'lodash';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import {
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiSkipLink,
  useGeneratedHtmlId,
  euiOverflowScroll,
  type UseEuiTheme,
} from '@elastic/eui';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { NoFieldsCallout } from './no_fields_callout';
import { FieldsAccordion, type FieldsAccordionProps, getFieldKey } from './fields_accordion';
import type { FieldListGroups, FieldListItem } from '../../types';
import { ExistenceFetchStatus, FieldsGroup, FieldsGroupNames } from '../../types';
import {
  useRestorableState,
  useRestorableRef,
  type UnifiedFieldListRestorableState,
} from '../../restorable_state';

const PAGINATION_SIZE = 50;
export const LOCAL_STORAGE_KEY_SECTIONS = 'unifiedFieldList.initiallyOpenSections';

type InitiallyOpenSections = UnifiedFieldListRestorableState['accordionState'];

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
  muteScreenReader?: boolean; // Changes aria-live from "polite" to "off" - it's useful when the numbers change due to something not directly related to the field list and we want to avoid announcing it.
  'data-test-subj'?: string;
}

function InnerFieldListGrouped<T extends FieldListItem = DataViewField>({
  fieldGroups,
  fieldsExistenceStatus,
  fieldsExistInIndex,
  renderFieldItem,
  scrollToTopResetCounter,
  screenReaderDescriptionId,
  muteScreenReader,
  localStorageKeyPrefix,
  'data-test-subj': dataTestSubject = 'fieldListGrouped',
}: FieldListGroupedProps<T>) {
  const styles = useMemoCss(componentStyles);

  const hasSyncedExistingFields =
    fieldsExistenceStatus && fieldsExistenceStatus !== ExistenceFetchStatus.unknown;

  const buttonIdPrefix = useGeneratedHtmlId({ prefix: 'fieldListGroupedButton' });

  const [fieldGroupsToShow, fieldGroupsToCollapse] = partition(
    Object.entries(fieldGroups),
    ([, { showInAccordion }]) => showInAccordion
  );
  const isInitializedRef = useRef<boolean>(false);
  const [pageSize, setPageSize] = useRestorableState('pageSize', PAGINATION_SIZE);
  const scrollTopRef = useRestorableRef('scrollTop', 0);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const [storedInitiallyOpenSections, storeInitiallyOpenSections] =
    useLocalStorage<InitiallyOpenSections>(
      `${localStorageKeyPrefix ? localStorageKeyPrefix + '.' : ''}${LOCAL_STORAGE_KEY_SECTIONS}`,
      {}
    );
  const [accordionState, setAccordionState] = useRestorableState(
    'accordionState',
    () =>
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
      ),
    {
      shouldStoreDefaultValueRightAway: true, // otherwise, it would re-initialize with the localStorage value which might get updated in the meantime
      shouldIgnoredRestoredValue: (restoredAccordionState) => {
        return (
          fieldGroupsToShow.length !== Object.keys(restoredAccordionState).length ||
          fieldGroupsToShow.some(([key]) => !(key in restoredAccordionState))
        );
      },
    }
  );

  useEffect(() => {
    // Reset the scroll if we have made material changes to the field list
    if (scrollContainer && scrollToTopResetCounter) {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        // If this is the first time after the mount, no need to reset the scroll position
        return;
      }
      scrollContainer.scrollTop = 0;
      scrollTopRef.current = 0;
      setPageSize(PAGINATION_SIZE);
    }
  }, [scrollToTopResetCounter, scrollContainer, setPageSize, scrollTopRef]);

  const lazyScroll = useCallback(() => {
    if (scrollContainer) {
      if (scrollContainer.scrollTop === scrollTopRef.current) {
        // scroll top was restored to the last position
        return;
      }

      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;

      scrollTopRef.current = scrollContainer.scrollTop;

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
  }, [scrollContainer, scrollTopRef, setPageSize, pageSize, fieldGroups, accordionState]);

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
      css={styles.outerContainer}
      data-test-subj={`${dataTestSubject}FieldGroups`}
      ref={(el) => {
        if (el && !el.scrollTop && scrollTopRef.current) {
          // restore scroll position after restoring the initial ref value
          setTimeout(() => {
            el.scrollTo?.({
              top: scrollTopRef.current,
              behavior: 'instant',
            });
          }, 0);
        }

        if (el && !el.dataset.dynamicScroll) {
          el.dataset.dynamicScroll = 'true';
          setScrollContainer(el);
        }
      }}
      onScroll={throttle(lazyScroll, 100)}
    >
      <div css={styles.innerContainer}>
        {Boolean(screenReaderDescriptionId) && (
          <EuiScreenReaderOnly>
            <div
              aria-live={muteScreenReader ? 'off' : 'polite'}
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
        {fieldGroupsToShow
          .filter(([_, fieldGroup]) => {
            if (fieldGroup.fields.length) return true;
            return !Boolean(fieldGroup.hideIfEmpty);
          })
          .map(([key, fieldGroup], index, _fieldGroupsToShow) => {
            const nextFieldGroup = _fieldGroupsToShow.at(index + 1);

            return (
              <Fragment key={key}>
                <FieldsAccordion<T>
                  id={`${dataTestSubject}${key}`}
                  buttonId={`${buttonIdPrefix}${key}`}
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
                  extraAction={
                    nextFieldGroup ? (
                      <EuiSkipLink
                        overrideLinkBehavior
                        destinationId={`${buttonIdPrefix}${nextFieldGroup[0]}`}
                      >
                        {i18n.translate('unifiedFieldList.fieldListGrouped.goToNextGroupLink', {
                          defaultMessage: 'Go to {nextFieldGroup}',
                          values: { nextFieldGroup: nextFieldGroup[1].title },
                        })}
                      </EuiSkipLink>
                    ) : null
                  }
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

/**
 * 1. Don't cut off the shadow of the field items
 */

const componentStyles = {
  outerContainer: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;

    return css([
      {
        marginLeft: `-${euiTheme.size.base}` /* 1 */,
        position: 'relative',
        flexGrow: 1,
        overflow: 'auto',
      },
      euiOverflowScroll(themeContext, { direction: 'y', mask: true }),
    ]);
  },
  innerContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingTop: euiTheme.size.s,
      position: 'absolute',
      top: 0,
      left: euiTheme.size.base /* 1 */,
      right: euiTheme.size.xs /* 1 */,
    }),
};
