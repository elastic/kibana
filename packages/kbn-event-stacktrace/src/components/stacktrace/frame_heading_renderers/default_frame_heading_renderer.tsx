/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FrameHeadingRendererProps } from '.';

export function DefaultFrameHeadingRenderer({
  stackframe,
  fileDetailComponent: FileDetail,
}: FrameHeadingRendererProps) {
  const lineNumber = stackframe.line?.number ?? 0;

  const name = 'filename' in stackframe ? stackframe.filename : stackframe.classname;

  return (
    <>
      <FileDetail>{name}</FileDetail> in <FileDetail>{stackframe.function}</FileDetail>
      {lineNumber > 0 && (
        <>
          {' at '}
          <FileDetail>line {lineNumber}</FileDetail>
        </>
      )}
    </>
  );
}
