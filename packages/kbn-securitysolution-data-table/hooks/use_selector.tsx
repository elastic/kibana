/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallowEqual, useSelector } from 'react-redux';

export type TypedUseSelectorHook = <TSelected, TState>(
  selector: (state: TState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
) => TSelected;

export const useShallowEqualSelector: TypedUseSelectorHook = (selector) =>
  useSelector(selector, shallowEqual);
