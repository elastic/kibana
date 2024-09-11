/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  for (const annotation of annotations) {
    if (typeof annotation === 'number') {
      const text = value.slice(pos, pos + annotation);
      pos += annotation;
      annotationNodes.push(<span>{text}</span>);
    } else {
      const [length, render] = annotation;
      const text = value.slice(pos, pos + length);
      pos += length;
      annotationNodes.push(render(text));
    }
  }

  return React.createElement('span', {}, ...annotationNodes);
};
