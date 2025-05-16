/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import type { Annotation } from './types';

export interface AnnotationsProps {
  value: string;
  annotations?: Annotation[];
}

export const Annotations: React.FC<AnnotationsProps> = (props) => {
  const { value, annotations = [] } = props;
  const annotationNodes: React.ReactNode[] = [];

  let pos = 0;

  for (const [start, end, render] of annotations) {
    if (start > pos) {
      const text = value.slice(pos, start);

      annotationNodes.push(<span>{text}</span>);
    }

    const text = value.slice(start, end);

    pos = end;
    annotationNodes.push(render(text));
  }

  if (pos < value.length) {
    const text = value.slice(pos);
    annotationNodes.push(<span>{text}</span>);
  }

  return React.createElement('span', {}, ...annotationNodes);
};
