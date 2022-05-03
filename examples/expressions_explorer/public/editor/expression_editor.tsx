/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function ExpressionEditor({ value, onChange }: Props) {
  return (
    <CodeEditor
      languageId="javascript"
      width="100%"
      height="250px"
      value={value}
      onChange={onChange}
      options={{
        fontSize: 14,
        fontFamily: 'monospace',
        quickSuggestions: true,
      }}
      aria-label="Code Editor"
    />
  );
}
