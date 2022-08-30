/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { GetGenericComboBoxPropsReturn } from '../get_generic_combo_box_props';

export interface FieldProps extends FieldBaseProps {
  isClearable: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  placeholder: string;
}
export interface FieldBaseProps {
  indexPattern: DataViewBase | undefined;
  fieldTypeFilter?: string[];
  isRequired?: boolean;
  selectedField?: DataViewFieldBase | undefined;
  fieldInputWidth?: number;
  onChange: (a: DataViewFieldBase[]) => void;
}

export interface ComboBoxFields {
  availableFields: DataViewField[];
  selectedFields: DataViewField[];
}

export interface GetFieldComboBoxPropsReturn extends GetGenericComboBoxPropsReturn {
  disabledLabelTooltipTexts: { [label: string]: string };
}

export interface DataViewField extends DataViewFieldBase {
  esTypes?: string[];
}
