/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition, throttle } from 'lodash';
import React, { useState, Fragment, useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, EuiSpacer } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { NoFieldsCallout } from './no_fields_callout';
import { FieldsAccordion, type FieldsAccordionProps } from './fields_accordion';
import './field_list_grouped.scss';

const PAGINATION_SIZE = 50;

export type FieldListGroups = Record<
  string,
  {
    fields: DataViewField[];
    fieldCount: number;
    showInAccordion: boolean;
    isInitiallyOpen: boolean;
    title: string;
    helpText?: string;
    isAffectedByGlobalFilter: boolean;
    isAffectedByTimeFilter: boolean;
    hideDetails?: boolean;
    defaultNoFieldsMessage?: string;
  }
>;

function getDisplayedFieldsLength(
  fieldGroups: FieldListGroups,
  accordionState: Partial<Record<string, boolean>>
) {
  return Object.entries(fieldGroups)
    .filter(([key]) => accordionState[key])
    .reduce((allFieldCount, [, { fields }]) => allFieldCount + fields.length, 0);
}

export interface FieldListGroupedProps {
  fieldGroups: FieldListGroups;
  hasSyncedExistingFields: boolean;
  existenceFetchFailed?: boolean;
  existenceFetchTimeout?: boolean;
  filter: {
    nameFilter: string;
    typeFilter: string[];
  };
  dataViewId: string;
  existFieldsInIndex: boolean;
  renderFieldItem: FieldsAccordionProps['renderFieldItem'];
  screenReaderDescriptionForSearchInputId?: string;
}

export const FieldListGrouped: React.FC<FieldListGroupedProps> = React.memo(
  function InnerFieldListGrouped({
    fieldGroups,
    existenceFetchFailed,
    existenceFetchTimeout,
    hasSyncedExistingFields,
    filter,
    dataViewId,
    existFieldsInIndex,
    renderFieldItem,
    screenReaderDescriptionForSearchInputId,
  }) {
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

    useEffect(() => {
      // Reset the scroll if we have made material changes to the field list
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
        setPageSize(PAGINATION_SIZE);
      }
    }, [filter.nameFilter, filter.typeFilter, dataViewId, scrollContainer]);

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
                getDisplayedFieldsLength(fieldGroups, accordionState)
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
              <div aria-live="polite" id={screenReaderDescriptionForSearchInputId}>
                {i18n.translate('unifiedFieldList.fieldListGrouped.fieldSearchLiveRegion', {
                  defaultMessage:
                    '{availableFields} available {availableFields, plural, one {field} other {fields}}. {emptyFields} empty {emptyFields, plural, one {field} other {fields}}. {metaFields} meta {metaFields, plural, one {field} other {fields}}.',
                  values: {
                    availableFields: fieldGroups.AvailableFields.fields.length,
                    // empty fields can be undefined if there is no existence information to be fetched
                    emptyFields: fieldGroups.EmptyFields?.fields.length || 0,
                    metaFields: fieldGroups.MetaFields.fields.length,
                  },
                })}
              </div>
            </EuiScreenReaderOnly>
          )}
          <ul>
            {fieldGroupsToCollapse.flatMap(([, { fields }]) =>
              fields.map((field, index) => (
                <Fragment key={field.name}>
                  {renderFieldItem({ field, itemIndex: index, groupIndex: 0, hideDetails: true })}
                </Fragment>
              ))
            )}
          </ul>
          <EuiSpacer size="s" />
          {fieldGroupsToShow.map(([key, fieldGroup], index) => (
            <Fragment key={key}>
              <FieldsAccordion
                initialIsOpen={Boolean(accordionState[key])}
                id={`fieldListGrouped${key}`}
                label={fieldGroup.title}
                helpTooltip={fieldGroup.helpText}
                hideDetails={fieldGroup.hideDetails}
                hasLoaded={!!hasSyncedExistingFields}
                fieldsCount={fieldGroup.fields.length}
                isFiltered={fieldGroup.fieldCount !== fieldGroup.fields.length}
                paginatedFields={paginatedFields[key]}
                groupIndex={index + 1}
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
                    Math.max(PAGINATION_SIZE, Math.min(pageSize * 1.5, displayedFieldLength))
                  );
                }}
                showExistenceFetchError={existenceFetchFailed}
                showExistenceFetchTimeout={existenceFetchTimeout}
                renderCallout={() => (
                  <NoFieldsCallout
                    isAffectedByGlobalFilter={fieldGroup.isAffectedByGlobalFilter}
                    isAffectedByTimerange={fieldGroup.isAffectedByTimeFilter}
                    isAffectedByFieldFilter={fieldGroup.fieldCount !== fieldGroup.fields.length}
                    existFieldsInIndex={!!existFieldsInIndex}
                    defaultNoFieldsMessage={fieldGroup.defaultNoFieldsMessage}
                  />
                )}
                renderFieldItem={renderFieldItem}
              />
              <EuiSpacer size="m" />
            </Fragment>
          ))}
        </div>
      </div>
    );
  }
);
