/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ScopedHistory } from 'kibana/public';
import { History, parsePath } from 'history';

interface LocationObject {
  pathname?: string;
  search?: string;
  hash?: string;
}

const isModifiedEvent = (event: any) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: any) => event.button === 0;

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

export const reactRouterOnClickHandler = (
  history: ScopedHistory | History,
  to: string | LocationObject,
  onClickCallback?: Function
) => (event: any) => {
  if (onClickCallback) {
    onClickCallback(event);
  }

  if (event.defaultPrevented) {
    return;
  }

  if (event.target.getAttribute('target')) {
    return;
  }

  if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
    return;
  }

  // prevents page reload
  event.preventDefault();
  history.push(toLocationObject(to));
};
