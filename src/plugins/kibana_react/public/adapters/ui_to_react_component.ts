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

import { FC, createElement as h, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { UiComponent, UiComponentInstance } from '../../../kibana_utils/common';

export const uiToReactComponent = <Props extends object>(
  Comp: UiComponent<Props>
): FC<Props> => props => {
  const ref = useRef<HTMLDivElement>();
  const comp = useMemo<UiComponentInstance<Props>>(() => Comp(), [Comp]);
  const render = useCallback(() => {
    if (!ref.current) return;
    comp.render(ref.current, props);
  }, [comp]);

  useLayoutEffect(() => {
    render();
  });

  useLayoutEffect(() => {
    if (!comp.unmount) return;
    return () => {
      if (comp.unmount) comp.unmount();
    };
  }, [comp]);

  return h('div', {
    ref: (el: HTMLDivElement) => {
      ref.current = el;
      if (el) render();
    },
  });
};
