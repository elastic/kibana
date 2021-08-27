/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { FC } from 'react';
import { createElement as h, useLayoutEffect, useMemo, useRef } from 'react';
import type {
  UiComponent,
  UiComponentInstance,
} from '../../../kibana_utils/common/ui/ui_component';

/**
 * Transforms `UiComponent` into a React component.
 */
export const uiToReactComponent = <Props extends object>(
  Comp: UiComponent<Props>,
  as: string = 'div'
): FC<Props> => (props) => {
  const ref = useRef<HTMLDivElement>();
  const comp = useMemo<UiComponentInstance<Props>>(() => Comp(), [Comp]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    comp.render(ref.current, props);
  });

  useLayoutEffect(() => {
    if (!comp.unmount) return;
    return () => {
      if (comp.unmount) comp.unmount();
    };
  }, [comp]);

  return h(as, {
    ref,
  });
};
