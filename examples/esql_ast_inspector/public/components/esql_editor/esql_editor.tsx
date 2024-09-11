/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { css } from '@emotion/react';
import { Annotations, type Annotation } from '../annotations';
import { FlexibleInput } from '../flexible_input/flexible_input';

const blockCss = css({
  display: 'inline-block',
  position: 'relative',
  width: '100%',
  fontSize: '16px',
});

const overlayCss = css({
  display: 'inline-block',
  position: 'absolute',
  left: 0,
  width: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
});

export interface EsqlEditorProps {
  src: string;
  highlight?: Annotation[];
  onChange: (src: string) => void;
}

export const EsqlEditor: React.FC<EsqlEditorProps> = ({ src, highlight, onChange }) => {
  const overlay = !!highlight && (
    <div css={overlayCss}>
      <Annotations value={src} annotations={highlight} />
    </div>
  );

  return (
    <div css={blockCss}>
      <FlexibleInput multiline value={src} onChange={(e) => onChange(e.target.value)} />
      {overlay}
    </div>
  );
};
