/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiMarkdownEditor } from '@elastic/eui';
import React, { useState } from 'react';

interface MarkdownProps {
  initialContent: string;
  ariaLabelContent: string;
}

export const Markdown = ({ initialContent, ariaLabelContent }: MarkdownProps) => {
  const [value, setValue] = useState(initialContent);

  return (
    <EuiMarkdownEditor
      aria-label={ariaLabelContent ?? 'markdown component'}
      placeholder="Your markdown here..."
      initialViewMode="viewing"
      value={value}
      onChange={setValue}
      height={200}
    />
  );
};
