/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition, throttle } from 'lodash';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, EuiSpacer } from '@elastic/eui';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { NoFieldsCallout } from './no_fields_callout';
import { FieldsAccordion, type FieldsAccordionProps } from './fields_accordion';
import type { FieldListGroups, FieldListItem } from '../../types';
import { ExistenceFetchStatus, FieldsGroupNames } from '../../types';
import './field_list_grouped.scss';

const PAGINATION_SIZE = 50;

function getDisplayedFieldsLength<T extends FieldListItem>(
  fieldGroups: FieldListGroups<T>,
  accordionState: Partial<Record<string, boolean>>
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
  screenReaderDescriptionForSearchInputId?: string;
  'data-test-subj'?: string;
}

function InnerFieldListGrouped<T extends FieldListItem = DataViewField>({
  fieldGroups,
  fieldsExistenceStatus,
  fieldsExistInIndex,
  renderFieldItem,
  screenReaderDescriptionForSearchInputId,
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
  const [accordionState, setAccordionState] = useState<Partial<Record<string, boolean>>>(() =>
    Object.fromEntries(
      fieldGroupsToShow.map(([key, { isInitiallyOpen }]) => [key, isInitiallyOpen])
    )
  );

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

  return (
    <div
      className="unifiedFieldList__fieldListGrouped"
      ref={(el) => {
        if (el && !el.dataset.dynamicScroll) {
          el.dataset.dynamicScroll = 'true';
          setScrollContainer(el);
        }
      }}
      onScroll={throttle(lazyScroll, 100)}
    >
      <div className="unifiedFieldList__fieldListGrouped__container">
        {Boolean(screenReaderDescriptionForSearchInputId) && (
          <EuiScreenReaderOnly>
            <div
              aria-live="polite"
              id={screenReaderDescriptionForSearchInputId}
              data-test-subj={`${dataTestSubject}__ariaDescription`}
            >
              {hasSyncedExistingFields
                ? [
                    fieldGroups.SelectedFields &&
                      (!fieldGroups.SelectedFields?.hideIfEmpty ||
                        fieldGroups.SelectedFields?.fields?.length > 0) &&
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
                    fieldGroups.EmptyFields &&
                      (!fieldGroups.EmptyFields?.hideIfEmpty ||
                        fieldGroups.EmptyFields?.fields?.length > 0) &&
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
                    fieldGroups.MetaFields &&
                      (!fieldGroups.MetaFields?.hideIfEmpty ||
                        fieldGroups.MetaFields?.fields?.length > 0) &&
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
        {Boolean(fieldGroupsToCollapse[0]?.[1]?.fields.length) && (
          <>
            <ul>
              {fieldGroupsToCollapse.flatMap(([key, { fields }]) =>
                fields.map((field, index) => (
                  <Fragment key={field.name}>
                    {renderFieldItem({
                      field,
                      itemIndex: index,
                      groupIndex: 0,
                      groupName: key as FieldsGroupNames,
                      hideDetails: true,
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
