/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface MarkdownSimpleProps {
  children: string;
}

// Render markdown string into JSX inside of a Fragment.
export const MarkdownSimple = ({ children }: MarkdownSimpleProps) => (
  <ReactMarkdown>{children}</ReactMarkdown>
);

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default MarkdownSimple;
