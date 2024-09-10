/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import type { Annotation } from '../annotations';
import { FlexibleInput } from '../flexible_input/flexible_input';

export interface EsqlEditorProps {
  src: string;
  highlight?: Annotation[];
  onChange: (src: string) => void;
}

export const EsqlEditor: React.FC<EsqlEditorProps> = ({ src, highlight, onChange }) => {
  return <FlexibleInput value={src} onChange={(e) => onChange(e.target.value)} />;
};
