/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './json_code_editor.scss';

import React from 'react';
import { JsonCodeEditorCommon } from './json_code_editor_common';

interface JsonCodeEditorProps {
  json: Record<string, unknown>;
  width?: string | number;
  height?: string | number;
  hasLineNumbers?: boolean;
}

export const JsonCodeEditor = ({ json, width, height, hasLineNumbers }: JsonCodeEditorProps) => {
  const jsonValue = JSON.stringify(json, null, 2);

  return (
    <JsonCodeEditorCommon
      jsonValue={jsonValue}
      width={width}
      height={height}
      hasLineNumbers={hasLineNumbers}
      onEditorDidMount={() => void 0}
      hideCopyButton={true}
    />
  );
};
