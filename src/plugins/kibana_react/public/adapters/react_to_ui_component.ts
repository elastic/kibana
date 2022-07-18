/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComponentType, createElement as h } from 'react';
import { render as renderReact, unmountComponentAtNode } from 'react-dom';
import { UiComponent, UiComponentInstance } from '@kbn/kibana-utils-plugin/public';

/**
 * Transform a React component into a `UiComponent`.
 *
 * @param ReactComp A React component.
 */
export const reactToUiComponent =
  <Props extends object>(ReactComp: ComponentType<Props>): UiComponent<Props> =>
  () => {
    let lastEl: HTMLElement | undefined;

    const render: UiComponentInstance<Props>['render'] = (el, props) => {
      lastEl = el;
      renderReact(h(ReactComp, props), el);
    };

    const unmount: UiComponentInstance<Props>['unmount'] = () => {
      if (lastEl) unmountComponentAtNode(lastEl);
    };

    const comp: UiComponentInstance<Props> = {
      render,
      unmount,
    };

    return comp;
  };
