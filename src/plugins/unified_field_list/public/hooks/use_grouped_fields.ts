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
  FieldsGroupNames,
} from '../types';
import { type ExistingFieldsReader } from './use_existing_fields';

const defaultFieldGroups: {
  specialFields: DataViewField[];
  availableFields: DataViewField[];
  emptyFields: DataViewField[];
  metaFields: DataViewField[];
} = {
  specialFields: [],
  availableFields: [],
  emptyFields: [],
  metaFields: [],
};

export interface GroupedFieldsParams {
  dataViewId: string;
  allFields: DataViewField[];
  services: {
    dataViews: DataViewsContract;
  };
  fieldsExistenceReader: ExistingFieldsReader;
  onOverrideFieldGroupDetails?: (
    groupName: FieldsGroupNames
  ) => Partial<FieldsGroupDetails> | undefined | null;
  onSupportedFieldFilter?: (field: DataViewField) => boolean;
  onSelectedFieldFilter?: (field: DataViewField) => boolean;
  onFilterField?: (field: DataViewField) => boolean;
}

export interface GroupedFieldsResult {
  fieldGroups: FieldListGroups;
}

export const useGroupedFields = ({
  dataViewId,
  allFields,
  services,
  fieldsExistenceReader,
  onOverrideFieldGroupDetails,
  onSupportedFieldFilter,
  onSelectedFieldFilter,
  onFilterField,
}: GroupedFieldsParams): GroupedFieldsResult => {
  const [dataView, setDataView] = useState<DataView | null>(null);
  const { hasFieldData, isFieldsExistenceInfoUnavailable } = fieldsExistenceReader;
  const fieldsExistenceInfoUnavailable = isFieldsExistenceInfoUnavailable(dataViewId);

  useEffect(() => {
    const getDataView = async () => {
      setDataView(await services.dataViews.get(dataViewId));
    };
    getDataView();
  }, [dataViewId, services.dataViews, setDataView]);

  const unfilteredFieldGroups: FieldListGroups = useMemo(() => {
    const containsData = (field: DataViewField) => {
      const overallField = dataView?.getFieldByName?.(field.name);
      return Boolean(overallField && hasFieldData(dataViewId, overallField.name));
    };

    const allSupportedTypesFields = onSupportedFieldFilter
      ? allFields.filter(onSupportedFieldFilter)
      : allFields;
    const selectedFields = onSelectedFieldFilter
      ? allSupportedTypesFields.filter(onSelectedFieldFilter)
      : allSupportedTypesFields;
    const sorted = allSupportedTypesFields.sort(sortFields);
    const groupedFields = {
      ...defaultFieldGroups,
      ...groupBy(sorted, (field) => {
        if (field.type === 'document') {
          return 'specialFields';
        } else if (dataView?.metaFields?.includes(field.name)) {
          return 'metaFields';
        } else if (containsData(field)) {
          return 'availableFields';
        } else return 'emptyFields';
      }),
    };

    let fieldGroupDefinitions: FieldListGroups = {
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
        isAffectedByTimeFilter: true,
        hideDetails: false,
        hideIfEmpty: true,
      },
      AvailableFields: {
        fields: groupedFields.availableFields,
        fieldCount: groupedFields.availableFields.length,
        isInitiallyOpen: true,
        showInAccordion: true,
        title: fieldsExistenceInfoUnavailable
          ? i18n.translate('unifiedFieldList.useGroupedFields.allFieldsLabel', {
              defaultMessage: 'All fields',
            })
          : i18n.translate('unifiedFieldList.useGroupedFields.availableFieldsLabel', {
              defaultMessage: 'Available fields',
            }),
        helpText: i18n.translate('unifiedFieldList.useGroupedFields.allFieldsLabelHelp', {
          defaultMessage: 'Data view fields', // TODO: what text should be in here by default?
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
      fieldGroupDefinitions = Object.keys(fieldGroupDefinitions).reduce<FieldListGroups>(
        (definitions, name) => {
          const groupName = name as FieldsGroupNames;
          const group: FieldsGroup | undefined = fieldGroupDefinitions[groupName];
          if (group) {
            definitions[groupName] = {
              ...group,
              ...(onOverrideFieldGroupDetails(groupName) || {}),
            };
          }
          return definitions;
        },
        {} as FieldListGroups
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
    hasFieldData,
    fieldsExistenceInfoUnavailable,
  ]);

  const fieldGroups: FieldListGroups = useMemo(() => {
    if (!onFilterField) {
      return unfilteredFieldGroups;
    }

    return Object.fromEntries(
      Object.entries(unfilteredFieldGroups).map(([name, group]) => [
        name,
        { ...group, fields: group.fields.filter(onFilterField) },
      ])
    ) as FieldListGroups;
  }, [unfilteredFieldGroups, onFilterField]);

  return useMemo(
    () => ({
      fieldGroups,
    }),
    [fieldGroups]
  );
};

function sortFields(fieldA: DataViewField, fieldB: DataViewField) {
  return fieldA.displayName.localeCompare(fieldB.displayName, undefined, { sensitivity: 'base' });
}
