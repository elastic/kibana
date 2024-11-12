/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  EuiComboBoxOptionOption,
  EuiIcon,
  EuiSpacer,
  EuiToolTip,
  useEuiPaddingSize,
} from '@elastic/eui';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import { FieldConflictsInfo, getMappingConflictsInfo } from '@kbn/securitysolution-list-utils';
import { getGenericComboBoxProps } from '../get_generic_combo_box_props';
import * as i18n from '../translations';
import {
  ComboBoxFields,
  DataViewField,
  FieldBaseProps,
  GetFieldComboBoxPropsReturn,
} from './types';
import { disabledTypesWithTooltipText } from './disabled_types_with_tooltip_text';

const getExistingFields = (indexPattern: DataViewBase | undefined): DataViewFieldBase[] => {
  return indexPattern != null ? indexPattern.fields : [];
};

const getSelectedFields = (selectedField: DataViewField | undefined): DataViewFieldBase[] => {
  return selectedField && selectedField.name.trim() !== '' ? [selectedField] : [];
};

const getAvailableFields = (
  existingFields: DataViewField[],
  selectedFields: DataViewField[],
  fieldTypeFilter: string[] | undefined
): DataViewField[] => {
  const fieldsByName = new Map<string, DataViewField>();

  existingFields.forEach((f) => fieldsByName.set(f.name, f));
  selectedFields.forEach((f) => fieldsByName.set(f.name, f));

  const uniqueFields = Array.from(fieldsByName.values());

  if (fieldTypeFilter && fieldTypeFilter?.length > 0) {
    return uniqueFields.filter(({ type }) => fieldTypeFilter.includes(type));
  }

  return uniqueFields;
};

const getComboBoxFields = (
  indexPattern: DataViewBase | undefined,
  selectedField: DataViewField | undefined,
  fieldTypeFilter: string[] | undefined
): ComboBoxFields => {
  const existingFields = getExistingFields(indexPattern);
  const selectedFields = getSelectedFields(selectedField);
  const availableFields = getAvailableFields(existingFields, selectedFields, fieldTypeFilter);

  return { availableFields, selectedFields };
};

const getDisabledLabelTooltipTexts = (fields: ComboBoxFields) => {
  const disabledLabelTooltipTexts = fields.availableFields.reduce(
    (acc: { [label: string]: string }, field: DataViewField) => {
      const esTypeKey = field.esTypes?.find((type) => disabledTypesWithTooltipText[type]);
      const tooltipText =
        (esTypeKey && disabledTypesWithTooltipText[esTypeKey]) ||
        disabledTypesWithTooltipText[field.type];
      if (tooltipText) acc[field.name] = tooltipText;
      return acc;
    },
    {}
  );
  return disabledLabelTooltipTexts;
};

const getMappingConflictsTooltipInfo = (fields: ComboBoxFields) => {
  const mappingConflictsTooltipInfo = fields.availableFields.reduce(
    (acc: { [label: string]: FieldConflictsInfo[] }, field: DataViewField) => {
      const conflictsInfo = getMappingConflictsInfo(field);
      if (!conflictsInfo) {
        return acc;
      }
      acc[field.name] = conflictsInfo;
      return acc;
    },
    {}
  );
  return mappingConflictsTooltipInfo;
};

const getComboBoxProps = (fields: ComboBoxFields): GetFieldComboBoxPropsReturn => {
  const { availableFields, selectedFields } = fields;

  const genericProps = getGenericComboBoxProps<DataViewFieldBase>({
    getLabel: (field) => field.name,
    options: availableFields,
    selectedOptions: selectedFields,
  });
  const disabledLabelTooltipTexts = getDisabledLabelTooltipTexts(fields);
  const mappingConflictsTooltipInfo = getMappingConflictsTooltipInfo(fields);
  return {
    ...genericProps,
    disabledLabelTooltipTexts,
    mappingConflictsTooltipInfo,
  };
};

export const useEsField = ({
  indexPattern,
  fieldTypeFilter,
  isRequired,
  selectedField,
  fieldInputWidth,
  showMappingConflicts,
  onChange,
}: FieldBaseProps) => {
  const [touched, setIsTouched] = useState(false);

  const [customOption, setCustomOption] = useState<DataViewFieldBase | null>(null);
  const sPaddingSize = useEuiPaddingSize('s');

  const { availableFields, selectedFields } = useMemo(() => {
    const indexPatternsToUse =
      customOption != null && indexPattern != null
        ? { ...indexPattern, fields: [customOption, ...indexPattern?.fields] }
        : indexPattern;
    return getComboBoxFields(indexPatternsToUse, selectedField, fieldTypeFilter);
  }, [indexPattern, fieldTypeFilter, selectedField, customOption]);

  const {
    comboOptions,
    labels,
    selectedComboOptions,
    disabledLabelTooltipTexts,
    mappingConflictsTooltipInfo,
  } = useMemo(
    () => getComboBoxProps({ availableFields, selectedFields }),
    [availableFields, selectedFields]
  );

  const handleValuesChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]): void => {
      const newValues: DataViewFieldBase[] = newOptions.map(
        ({ label }) => availableFields[labels.indexOf(label)]
      );
      onChange(newValues);
    },
    [availableFields, labels, onChange]
  );

  const handleCreateCustomOption = useCallback(
    (val: string) => {
      const normalizedSearchValue = val.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }
      setCustomOption({ name: val, type: 'text' });
      onChange([{ name: val, type: 'text' }]);
    },
    [onChange]
  );

  const handleTouch = useCallback((): void => {
    setIsTouched(true);
  }, [setIsTouched]);

  const fieldWidth = useMemo(() => {
    return fieldInputWidth ? { width: `${fieldInputWidth}px` } : {};
  }, [fieldInputWidth]);

  const isInvalid = useMemo(
    () => (isRequired ? touched && selectedField == null : false),
    [isRequired, selectedField, touched]
  );

  const renderFields = (
    option: EuiComboBoxOptionOption<string | number | string[] | undefined>
  ) => {
    const { label } = option;

    const labelTooltipText = disabledLabelTooltipTexts[label];
    if (labelTooltipText) {
      option.disabled = true;
      return (
        <EuiToolTip
          data-test-subj="disabledLabelWithTooltip"
          content={labelTooltipText}
          position="bottom"
        >
          <>{label}</>
        </EuiToolTip>
      );
    }

    const conflictsInfo = mappingConflictsTooltipInfo[label];
    if (showMappingConflicts && conflictsInfo) {
      const tooltipContent = (
        <>
          {i18n.FIELD_CONFLICT_INDICES_WARNING_DESCRIPTION}
          {conflictsInfo.map((info) => {
            const groupDetails = info.groupedIndices.map(
              ({ name, count }) =>
                `${count > 1 ? i18n.CONFLICT_MULTIPLE_INDEX_DESCRIPTION(name, count) : name}`
            );
            return (
              <>
                <EuiSpacer size="s" />
                {`${
                  info.totalIndexCount > 1
                    ? i18n.CONFLICT_MULTIPLE_INDEX_DESCRIPTION(info.type, info.totalIndexCount)
                    : info.type
                }: ${groupDetails.join(', ')}`}
              </>
            );
          })}
        </>
      );
      return (
        <EuiToolTip
          data-test-subj="mappingConflictsTooltip"
          position="bottom"
          content={tooltipContent}
        >
          <>
            {label}
            <EuiIcon
              data-test-subj="mappingConflictsWarningIcon"
              tabIndex={0}
              type="warning"
              title={i18n.FIELD_CONFLICT_INDICES_WARNING_TITLE}
              size="s"
              css={{ marginLeft: `${sPaddingSize}` }}
            />
          </>
        </EuiToolTip>
      );
    }

    return label;
  };
  return {
    isInvalid,
    comboOptions,
    selectedComboOptions,
    fieldWidth,

    renderFields,
    handleTouch,
    handleValuesChange,
    handleCreateCustomOption,
  };
};
