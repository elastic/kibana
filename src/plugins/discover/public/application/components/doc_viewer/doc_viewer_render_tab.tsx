/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useRef, useEffect } from 'react';
import { DocViewRenderFn, DocViewRenderProps } from '../../doc_views/doc_views_types';

interface Props {
  render: DocViewRenderFn;
  renderProps: DocViewRenderProps;
}
/**
 * Responsible for rendering a tab provided by a render function.
 * So any other framework can be used (E.g. legacy Angular 3rd party plugin code)
 * The provided `render` function is called with a reference to the
 * component's `HTMLDivElement` as 1st arg and `renderProps` as 2nd arg
 */
export function DocViewRenderTab({ render, renderProps }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref && ref.current) {
      return render(ref.current, renderProps);
    }
  }, [render, renderProps]);
  return <div ref={ref} />;
}
