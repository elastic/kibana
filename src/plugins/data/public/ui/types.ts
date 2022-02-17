/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiButtonProps, EuiSelectableProps } from '@elastic/eui';

export type ChangeIndexPatternTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

export interface IndexPatternRef {
  id: string;
  title: string;
}

export interface DataViewsPickerProps {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  isMissingCurrent?: boolean;
  onChangeIndexPattern: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
}
