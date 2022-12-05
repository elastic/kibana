/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupBy } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { type DataView, type DataViewField } from '@kbn/data-views-plugin/common';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  type FieldListGroups,
  type FieldsGroupDetails,
  type FieldsGroup,
  type FieldListItem,
  FieldsGroupNames,
  ExistenceFetchStatus,
} from '../types';
import { type ExistingFieldsReader } from './use_existing_fields';

export interface GroupedFieldsParams<T extends FieldListItem> {
  dataViewId: string | null; // `null` is for text-based queries
  allFields: T[] | null; // `null` is for loading indicator
  services: {
    dataViews: DataViewsContract;
  };
  fieldsExistenceReader?: ExistingFieldsReader; // use `undefined` for text-based queries
  isAffectedByGlobalFilter?: boolean;
  popularFieldsLimit?: number;
  sortedSelectedFields?: T[];
  onOverrideFieldGroupDetails?: (
    groupName: FieldsGroupNames
  ) => Partial<FieldsGroupDetails> | undefined | null;
  onSupportedFieldFilter?: (field: T) => boolean;
  onSelectedFieldFilter?: (field: T) => boolean;
  onFilterField?: (field: T) => boolean;
}

export interface GroupedFieldsResult<T extends FieldListItem> {
  fieldGroups: FieldListGroups<T>;
  scrollToTopResetCounter: number;
  fieldsExistenceStatus: ExistenceFetchStatus;
  fieldsExistInIndex: boolean;
}

export function useGroupedFields<T extends FieldListItem = DataViewField>({
  dataViewId,
  allFields,
  services,
  fieldsExistenceReader,
  isAffectedByGlobalFilter = false,
  popularFieldsLimit,
  sortedSelectedFields,
  onOverrideFieldGroupDetails,
  onSupportedFieldFilter,
  onSelectedFieldFilter,
  onFilterField,
}: GroupedFieldsParams<T>): GroupedFieldsResult<T> {
  const [dataView, setDataView] = useState<DataView | null>(null);
  const isAffectedByTimeFilter = Boolean(dataView?.timeFieldName);
  const fieldsExistenceInfoUnavailable: boolean = dataViewId
    ? fieldsExistenceReader?.isFieldsExistenceInfoUnavailable(dataViewId) ?? false
    : true;
  const hasFieldDataHandler =
    dataViewId && fieldsExistenceReader
      ? fieldsExistenceReader.hasFieldData
      : hasFieldDataByDefault;

  useEffect(() => {
    const getDataView = async () => {
      if (dataViewId) {
        setDataView(await services.dataViews.get(dataViewId));
      }
    };
    getDataView();
    // if field existence information changed, reload the data view too
  }, [dataViewId, services.dataViews, setDataView, hasFieldDataHandler]);

  // important when switching from a known dataViewId to no data view (like in text-based queries)
  useEffect(() => {
    if (dataView && !dataViewId) {
      setDataView(null);
    }
  }, [dataView, setDataView, dataViewId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scrollToTopResetCounter: number = useMemo(() => Date.now(), [dataViewId, onFilterField]);

  const unfilteredFieldGroups: FieldListGroups<T> = useMemo(() => {
    const containsData = (field: T) => {
      return dataViewId ? hasFieldDataHandler(dataViewId, field.name) : true;
    };

    const selectedFields = sortedSelectedFields || [];
    const sortedFields = [...(allFields || [])].sort(sortFields);
    const groupedFields = {
      ...getDefaultFieldGroups(),
      ...groupBy(sortedFields, (field) => {
        if (!sortedSelectedFields && onSelectedFieldFilter && onSelectedFieldFilter(field)) {
          selectedFields.push(field);
        }
        if (onSupportedFieldFilter && !onSupportedFieldFilter(field)) {
          return 'skippedFields';
        }
        if (field.type === 'document') {
          return 'specialFields';
        }
        if (dataView?.metaFields?.includes(field.name)) {
          return 'metaFields';
        }
        if (dataView?.getFieldByName && !dataView.getFieldByName(field.name)) {
          return 'unmappedFields';
        }
        if (containsData(field) || fieldsExistenceInfoUnavailable) {
          return 'availableFields';
        }
        return 'emptyFields';
      }),
    };

    const popularFields = popularFieldsLimit
      ? sortedFields
          .filter(
            (field) =>
              field.count &&
              field.type !== '_source' &&
              (!onSupportedFieldFilter || onSupportedFieldFilter(field))
          )
          .sort((a: T, b: T) => (b.count || 0) - (a.count || 0)) // sort by popularity score
          .slice(0, popularFieldsLimit)
      : [];

    let fieldGroupDefinitions: FieldListGroups<T> = {
      SpecialFields: {
        fields: groupedFields.specialFields,
        fieldCount: groupedFields.specialFields.length,
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
        isInitiallyOpen: false,
        showInAccordion: false,
        title: '',
        hideDetails: true,
      },
      SelectedFields: {
        fields: selectedFields,
        fieldCount: selectedFields.length,
        isInitiallyOpen: true,
        showInAccordion: true,
        title: i18n.translate('unifiedFieldList.useGroupedFields.selectedFieldsLabel', {
          defaultMessage: 'Selected fields',
        }),
        isAffectedByGlobalFilter,
        isAffectedByTimeFilter,
        hideDetails: false,
        hideIfEmpty: true,
      },
      PopularFields: {
        fields: popularFields,
        fieldCount: popularFields.length,
        isInitiallyOpen: true,
        showInAccordion: true,
        title: i18n.translate('unifiedFieldList.useGroupedFields.popularFieldsLabel', {
          defaultMessage: 'Popular fields',
        }),
        helpText: i18n.translate('unifiedFieldList.useGroupedFields.popularFieldsLabelHelp', {
          defaultMessage:
            'Fields that your organization frequently uses, from most to least popular.',
        }),
        isAffectedByGlobalFilter,
        isAffectedByTimeFilter,
        hideDetails: false,
        hideIfEmpty: true,
      },
      AvailableFields: {
        fields: groupedFields.availableFields,
        fieldCount: groupedFields.availableFields.length,
        isInitiallyOpen: true,
        showInAccordion: true,
        title:
          dataViewId && fieldsExistenceInfoUnavailable
            ? i18n.translate('unifiedFieldList.useGroupedFields.allFieldsLabel', {
                defaultMessage: 'All fields',
              })
            : i18n.translate('unifiedFieldList.useGroupedFields.availableFieldsLabel', {
                defaultMessage: 'Available fields',
              }),
        isAffectedByGlobalFilter,
        isAffectedByTimeFilter,
        // Show details on timeout but not failure
        // hideDetails: fieldsExistenceInfoUnavailable && !existenceFetchTimeout, // TODO: is this check still necessary?
        hideDetails: fieldsExistenceInfoUnavailable,
        defaultNoFieldsMessage: i18n.translate(
          'unifiedFieldList.useGroupedFields.noAvailableDataLabel',
          {
            defaultMessage: `There are no available fields that contain data.`,
          }
        ),
      },
      UnmappedFields: {
        fields: groupedFields.unmappedFields,
        fieldCount: groupedFields.unmappedFields.length,
        isAffectedByGlobalFilter,
        isAffectedByTimeFilter,
        isInitiallyOpen: false,
        showInAccordion: true,
        hideDetails: false,
        hideIfEmpty: true,
        title: i18n.translate('unifiedFieldList.useGroupedFields.unmappedFieldsLabel', {
          defaultMessage: 'Unmapped fields',
        }),
        helpText: i18n.translate('unifiedFieldList.useGroupedFields.unmappedFieldsLabelHelp', {
          defaultMessage: "Fields that aren't explicitly mapped to a field data type.",
        }),
      },
      EmptyFields: {
        fields: groupedFields.emptyFields,
        fieldCount: groupedFields.emptyFields.length,
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
        isInitiallyOpen: false,
        showInAccordion: true,
        hideDetails: false,
        hideIfEmpty: !dataViewId,
        title: i18n.translate('unifiedFieldList.useGroupedFields.emptyFieldsLabel', {
          defaultMessage: 'Empty fields',
        }),
        helpText: i18n.translate('unifiedFieldList.useGroupedFields.emptyFieldsLabelHelp', {
          defaultMessage: "Fields that don't have any values based on your filters.",
        }),
        defaultNoFieldsMessage: i18n.translate(
          'unifiedFieldList.useGroupedFields.noEmptyDataLabel',
          {
            defaultMessage: `There are no empty fields.`,
          }
        ),
      },
      MetaFields: {
        fields: groupedFields.metaFields,
        fieldCount: groupedFields.metaFields.length,
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
        isInitiallyOpen: false,
        showInAccordion: true,
        hideDetails: false,
        hideIfEmpty: !dataViewId,
        title: i18n.translate('unifiedFieldList.useGroupedFields.metaFieldsLabel', {
          defaultMessage: 'Meta fields',
        }),
        defaultNoFieldsMessage: i18n.translate(
          'unifiedFieldList.useGroupedFields.noMetaDataLabel',
          {
            defaultMessage: `There are no meta fields.`,
          }
        ),
      },
    };

    // do not show empty field accordion if there is no existence information
    if (fieldsExistenceInfoUnavailable) {
      delete fieldGroupDefinitions.EmptyFields;
    }

    if (onOverrideFieldGroupDetails) {
      fieldGroupDefinitions = Object.keys(fieldGroupDefinitions).reduce<FieldListGroups<T>>(
        (definitions, name) => {
          const groupName = name as FieldsGroupNames;
          const group: FieldsGroup<T> | undefined = fieldGroupDefinitions[groupName];
          if (group) {
            definitions[groupName] = {
              ...group,
              ...(onOverrideFieldGroupDetails(groupName) || {}),
            };
          }
          return definitions;
        },
        {} as FieldListGroups<T>
      );
    }

    return fieldGroupDefinitions;
  }, [
    allFields,
    onSupportedFieldFilter,
    onSelectedFieldFilter,
    onOverrideFieldGroupDetails,
    dataView,
    dataViewId,
    hasFieldDataHandler,
    fieldsExistenceInfoUnavailable,
    isAffectedByGlobalFilter,
    isAffectedByTimeFilter,
    popularFieldsLimit,
    sortedSelectedFields,
  ]);

  const fieldGroups: FieldListGroups<T> = useMemo(() => {
    if (!onFilterField) {
      return unfilteredFieldGroups;
    }

    return Object.fromEntries(
      Object.entries(unfilteredFieldGroups).map(([name, group]) => [
        name,
        { ...group, fields: group.fields.filter(onFilterField) },
      ])
    ) as FieldListGroups<T>;
  }, [unfilteredFieldGroups, onFilterField]);

  const hasDataLoaded = Boolean(allFields);
  const allFieldsLength = allFields?.length;

  const fieldsExistInIndex = useMemo(() => {
    return dataViewId ? Boolean(allFieldsLength) : true;
  }, [dataViewId, allFieldsLength]);

  const fieldsExistenceStatus = useMemo(() => {
    if (!hasDataLoaded) {
      return ExistenceFetchStatus.unknown; // to show loading indicator in the list
    }
    if (!dataViewId || !fieldsExistenceReader) {
      // ex. for text-based queries
      return ExistenceFetchStatus.succeeded;
    }
    return fieldsExistenceReader.getFieldsExistenceStatus(dataViewId);
  }, [dataViewId, hasDataLoaded, fieldsExistenceReader]);

  return useMemo(() => {
    return {
      fieldGroups,
      scrollToTopResetCounter,
      fieldsExistInIndex,
      fieldsExistenceStatus,
    };
  }, [fieldGroups, scrollToTopResetCounter, fieldsExistInIndex, fieldsExistenceStatus]);
}

const collator = new Intl.Collator(undefined, {
  sensitivity: 'base',
});
function sortFields<T extends FieldListItem>(fieldA: T, fieldB: T) {
  return collator.compare(fieldA.displayName || fieldA.name, fieldB.displayName || fieldB.name);
}

function hasFieldDataByDefault(): boolean {
  return true;
}

function getDefaultFieldGroups() {
  return {
    specialFields: [],
    availableFields: [],
    emptyFields: [],
    metaFields: [],
    unmappedFields: [],
    skippedFields: [],
  };
}
