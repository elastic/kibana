/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Assign } from '@kbn/utility-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FetchedIndexPattern, IndexPatternValue } from '../../../../../common/types';

/** @internal **/
export interface SelectIndexComponentProps {
  fetchedIndex: FetchedIndexPattern & {
    defaultIndex?: DataView | null;
  };
  onIndexChange: (value: IndexPatternValue) => void;
  onModeChange: (useKibanaIndexes: boolean, index?: FetchedIndexPattern) => void;
  'data-test-subj': string;
  placeholder?: string;
  disabled?: boolean;
  allowSwitchMode?: boolean;
}

/** @internal **/
export type PopoverProps = Assign<
  Pick<SelectIndexComponentProps, 'onModeChange' | 'fetchedIndex'>,
  {
    useKibanaIndices: boolean;
  }
>;
