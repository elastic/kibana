/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, distinctUntilChanged, Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { isEqual } from 'lodash';

export const useObservableSelector = <S, R>(
  observable: Observable<S>,
  selector: (arg0: S) => R,
  defaultValue: R
): R => useObservable(observable.pipe(map(selector), distinctUntilChanged(isEqual)), defaultValue);

export const useStateSelectorFactory =
  <S>(state: Observable<S>) =>
  <R>(selector: (arg0: S) => R, defaultValue: R) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useObservableSelector(state, selector, defaultValue);
