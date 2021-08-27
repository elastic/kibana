/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { IndexPatternSelect } from '.';
import type { IndexPatternsContract } from '../../../common/index_patterns/index_patterns/index_patterns';
import type { IndexPatternSelectProps } from './index_pattern_select';

// Takes in stateful runtime dependencies and pre-wires them to the component
export function createIndexPatternSelect(indexPatternService: IndexPatternsContract) {
  return (props: IndexPatternSelectProps) => (
    <IndexPatternSelect {...props} indexPatternService={indexPatternService} />
  );
}
