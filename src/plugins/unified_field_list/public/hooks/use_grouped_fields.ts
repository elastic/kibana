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
} from '../types';
import { type ExistingFieldsReader } from './use_existing_fields';

export interface GroupedFieldsParams<T extends FieldListItem> {
  dataViewId: string | null; // `null` is for text-based queries
  allFields: T[];
  services: {
    dataViews: DataViewsContract;
  };
  fieldsExistenceReader?: ExistingFieldsReader;
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
}

export function useGroupedFields<T extends FieldListItem = DataViewField>({
  dataViewId,
  allFields,
  services,
  fieldsExistenceReader,
  popularFieldsLimit,
  sortedSelectedFields,
  onOverrideFieldGroupDetails,
  onSupportedFieldFilter,
  onSelectedFieldFilter,
  onFilterField,
}: GroupedFieldsParams<T>): GroupedFieldsResult<T> {
  const [dataView, setDataView] = useState<DataView | null>(null);
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

  const unfilteredFieldGroups: FieldListGroups<T> = useMemo(() => {
    const containsData = (field: T) => {
      if (!dataViewId || !dataView) {
        return true;
      }
      const overallField = dataView.getFieldByName?.(field.name);
      return Boolean(overallField && hasFieldDataHandler(dataViewId, overallField.name));
    };

    const fields = allFields || [];
    const allSupportedTypesFields = onSupportedFieldFilter
      ? fields.filter(onSupportedFieldFilter)
      : fields;
    const sortedFields = [...allSupportedTypesFields].sort(sortFields);
    const groupedFields = {
      ...getDefaultFieldGroups(),
      ...groupBy(sortedFields, (field) => {
        if (field.type === 'document') {
          return 'specialFields';
        } else if (dataView?.metaFields?.includes(field.name)) {
          return 'metaFields';
        } else if (containsData(field)) {
          return 'availableFields';
        } else return 'emptyFields';
      }),
    };
    const selectedFields =
      sortedSelectedFields ||
      (onSelectedFieldFilter ? sortedFields.filter(onSelectedFieldFilter) : []);
    const popularFields = popularFieldsLimit
      ? sortedFields
          .filter((field) => field.count && field.type !== '_source' && containsData(field))
          .sort((a: T, b: T) => (b.count || 0) - (a.count || 0))
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
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: false,
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
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: true,
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
        isAffectedByGlobalFilter: false,
        isAffectedByTimeFilter: true,
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
        defaultNoFieldsMessage: i18n.translate(
          'unifiedFieldList.useGroupedFields.noEmptyDataLabel',
          {
            defaultMessage: `There are no empty fields.`,
          }
        ),
        helpText: i18n.translate('unifiedFieldList.useGroupedFields.emptyFieldsLabelHelp', {
          defaultMessage: 'Empty fields did not contain any values based on your filters.',
        }),
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

  return useMemo(
    () => ({
      fieldGroups,
    }),
    [fieldGroups]
  );
}

function sortFields<T extends FieldListItem>(fieldA: T, fieldB: T) {
  return (fieldA.displayName || fieldA.name).localeCompare(
    fieldB.displayName || fieldB.name,
    undefined,
    {
      sensitivity: 'base',
    }
  );
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
  };
}
