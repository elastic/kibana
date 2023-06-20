/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewFieldBase } from '@kbn/es-query';
import { FieldConflictsInfo } from '@kbn/securitysolution-list-utils';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import { GetGenericComboBoxPropsReturn } from '../get_generic_combo_box_props';

export interface FieldProps extends FieldBaseProps {
  isClearable: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  placeholder: string;
  acceptsCustomOptions?: boolean;
  showMappingConflicts?: boolean;
}
export interface FieldBaseProps {
  indexPattern: DataViewSpec | undefined;
  fieldTypeFilter?: string[];
  isRequired?: boolean;
  selectedField?: FieldSpec | undefined;
  fieldInputWidth?: number;
  showMappingConflicts?: boolean;
  onChange: (a: FieldSpec[]) => void;
}

export interface ComboBoxFields {
  availableFields: FieldSpec[];
  selectedFields: FieldSpec[];
}

export interface GetFieldComboBoxPropsReturn extends GetGenericComboBoxPropsReturn {
  disabledLabelTooltipTexts: { [label: string]: string };
  mappingConflictsTooltipInfo: { [label: string]: FieldConflictsInfo[] };
}

/**
 * @deprecated use FieldSpec or DataViewFieldMap from @kbn/data-views-plugin/common
 */
export interface DataViewField extends DataViewFieldBase {
  esTypes?: string[];
}
