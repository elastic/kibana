/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Assign } from '@kbn/utility-types';
import type { IndexPatternObject } from '../../../../../common/types';

/** @internal **/
export interface SelectIndexComponentProps {
  value: IndexPatternObject;
  onIndexChange: (value: IndexPatternObject) => void;
  onModeChange: (useKibanaIndexes: boolean) => void;
  'data-test-subj': string;
  placeholder?: string;
  disabled?: boolean;
  allowSwitchMode?: boolean;
}

/** @internal **/
export type PopoverProps = Assign<
  Pick<SelectIndexComponentProps, 'onModeChange' | 'value'>,
  {
    useKibanaIndices: boolean;
    matchedIndex?: IndexPatternObject;
  }
>;
