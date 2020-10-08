/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
