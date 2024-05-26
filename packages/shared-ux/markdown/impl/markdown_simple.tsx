/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';

export interface MarkdownSimpleProps {
  src: string;
}

export const MarkdownSimple: React.FC<MarkdownSimpleProps> = ({ src }) => (
  <EuiMarkdownFormat aria-label={'markdown component'} children={src} />
);
