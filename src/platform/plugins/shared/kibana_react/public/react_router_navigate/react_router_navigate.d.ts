/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScopedHistory } from '@kbn/core/public';
import type { MouseEvent } from 'react';
import type { History } from 'history';
interface LocationObject {
  pathname?: string;
  search?: string;
  hash?: string;
}
export declare const toLocationObject: (to: string | LocationObject) => LocationObject;
export declare const reactRouterNavigate: (
  history: ScopedHistory | History,
  to: string | LocationObject,
  onClickCallback?: Function
) => {
  href: string;
  onClick: (event: MouseEvent) => void;
};
export declare const reactRouterOnClickHandler: (
  history: ScopedHistory | History,
  to: string | LocationObject,
  onClickCallback?: Function
) => (event: MouseEvent) => void;
export {};
