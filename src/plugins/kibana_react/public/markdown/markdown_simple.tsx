/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';

const markdownRenderers = {
  root: Fragment,
};

export interface MarkdownSimpleProps {
  children: string;
}

// Render markdown string into JSX inside of a Fragment.
export const MarkdownSimple = ({ children }: MarkdownSimpleProps) => (
  <ReactMarkdown renderers={markdownRenderers}>{children}</ReactMarkdown>
);

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default MarkdownSimple;
