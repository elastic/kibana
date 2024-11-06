/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { css } from '@emotion/react';
import { Annotations, type Annotation } from '../annotations';
import { FlexibleInput } from '../flexible_input/flexible_input';

const blockCss = css({
  display: 'inline-block',
  position: 'relative',
  width: '100%',
  fontSize: '18px',
  lineHeight: '1.3',
  fontFamily:
    "'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace",
});

const backdropCss = css({
  display: 'inline-block',
  position: 'absolute',
  left: 0,
  width: '100%',
  pointerEvents: 'all',
  userSelect: 'none',
  whiteSpace: 'pre',
  color: 'rgba(255, 255, 255, 0.01)',
});

const inputCss = css({
  display: 'inline-block',
  color: 'rgba(255, 255, 255, 0.01)',
  caretColor: '#07f',
});

const overlayCss = css({
  display: 'inline-block',
  position: 'absolute',
  left: 0,
  width: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
  whiteSpace: 'pre',
});

export interface EsqlEditorProps {
  src: string;
  backdrops?: Annotation[][];
  highlight?: Annotation[];
  onChange: (src: string) => void;
}

export const EsqlEditor: React.FC<EsqlEditorProps> = (props) => {
  const { src, highlight, onChange } = props;

  const backdrops: React.ReactNode[] = [];

  if (props.backdrops) {
    for (let i = 0; i < props.backdrops.length; i++) {
      const backdrop = props.backdrops[i];

      backdrops.push(
        <div key={i} css={backdropCss}>
          <Annotations value={src} annotations={backdrop} />
        </div>
      );
    }
  }

  const overlay = !!highlight && (
    <div css={overlayCss}>
      <Annotations value={src} annotations={highlight} />
    </div>
  );

  return (
    <div css={blockCss}>
      {backdrops}
      <div css={inputCss}>
        <FlexibleInput multiline value={src} onChange={(e) => onChange(e.target.value)} />
      </div>
      {overlay}
    </div>
  );
};
