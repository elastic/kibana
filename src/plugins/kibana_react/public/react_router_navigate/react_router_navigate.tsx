/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScopedHistory } from '@kbn/core/public';
import { MouseEvent } from 'react';
import { History, parsePath } from 'history';

interface LocationObject {
  pathname?: string;
  search?: string;
  hash?: string;
}

const isModifiedEvent = (event: MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: MouseEvent) => event.button === 0;

export const toLocationObject = (to: string | LocationObject) =>
  typeof to === 'string' ? parsePath(to) : to;

export const reactRouterNavigate = (
  history: ScopedHistory | History,
  to: string | LocationObject,
  onClickCallback?: Function
) => ({
  href: history.createHref(toLocationObject(to)),
  onClick: reactRouterOnClickHandler(history, toLocationObject(to), onClickCallback),
});

export const reactRouterOnClickHandler =
  (history: ScopedHistory | History, to: string | LocationObject, onClickCallback?: Function) =>
  (event: MouseEvent) => {
    if (onClickCallback) {
      onClickCallback(event);
    }

    if (event.defaultPrevented) {
      return;
    }

    if (
      (event.target as unknown as { getAttribute: (a: string) => unknown })?.getAttribute('target')
    ) {
      return;
    }

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
      return;
    }

    // prevents page reload
    event.preventDefault();
    history.push(toLocationObject(to));
  };
