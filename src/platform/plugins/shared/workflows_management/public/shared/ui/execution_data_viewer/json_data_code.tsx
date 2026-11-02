/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { JsonValue } from '@kbn/utility-types';
import { JSONCodeEditorCommonMemoized } from './json_editor_common';

interface JsonDataCodeProps {
  json: JsonValue;
}

export const JsonDataCode = ({ json }: JsonDataCodeProps) => {
  const formattedJson = useMemo(() => {
    return JSON.stringify(json, null, 2);
  }, [json]);

  return (
    <JSONCodeEditorCommonMemoized
      data-test-subj="workflowStepResultJsonEditor"
      jsonValue={formattedJson}
      onEditorDidMount={() => {}}
      height="100%"
      hasLineNumbers
      enableFindAction
    />
  );
};
