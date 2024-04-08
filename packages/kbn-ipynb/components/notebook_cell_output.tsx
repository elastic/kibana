/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';

import { NotebookOutputType } from '../types';
import { isDefined, combineSource } from '../utils';

export const NotebookCellOutput = ({ output }: { output: NotebookOutputType }) => {
  if (output.text && output.text.length > 0) {
    return <EuiCodeBlock>{combineSource(output.text)}</EuiCodeBlock>;
  }
  if (!isDefined(output.data)) return null;
  if (isDefined(output.data['text/plain'])) {
    return <EuiCodeBlock>{combineSource(output.data['text/plain'])}</EuiCodeBlock>;
  }
  if (isDefined(output.data['text/html'])) {
    return <EuiCodeBlock>{combineSource(output.data['text/html'])}</EuiCodeBlock>;
  }
  // TODO: handle other output data types
  return null;
};
