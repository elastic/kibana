/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserMouseEvent, UserTouchEvent } from '../types';

export const isTouchEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserTouchEvent => {
  return 'touches' in e;
};

export const isMouseEvent = (e: Event | React.UIEvent<HTMLElement>): e is UserMouseEvent => {
  return 'clientX' in e;
};
