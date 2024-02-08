/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';

export const MonacoEditor: FunctionComponent = () => {
  const [value, setValue] = useState('{"test":"test"}');
  return (
    <div css={css`width: 100%;`}>
      <CodeEditor
      languageId="json"
      value={value}
      onChange={setValue}
      fullWidth={true}
      />
    </div>
  );
};
