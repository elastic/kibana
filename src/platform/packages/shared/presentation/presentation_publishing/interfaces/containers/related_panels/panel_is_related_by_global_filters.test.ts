/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { panelIsRelatedByGlobalFilters } from './panel_is_related_by_global_filters';

const filterControl = (useGlobalFilters: boolean | undefined) => ({
  useGlobalFilters$: new BehaviorSubject<boolean | undefined>(useGlobalFilters),
});

describe('panelIsRelatedByGlobalFilters', () => {
  test('returns true for siblings without a useGlobalFilters setting', () => {
    const useGlobalFilters$ = new BehaviorSubject<boolean | undefined>(false);
    const { isRelated } = panelIsRelatedByGlobalFilters(useGlobalFilters$);

    expect(isRelated({}, [false], [undefined])).toBe(true);
  });

  test('returns true when self and sibling both use global filters', () => {
    const useGlobalFilters$ = new BehaviorSubject<boolean | undefined>(true);
    const { isRelated } = panelIsRelatedByGlobalFilters(useGlobalFilters$);

    expect(isRelated(filterControl(true), [true], [true])).toBe(true);
  });

  test('returns false when self does not use global filters but sibling does', () => {
    const useGlobalFilters$ = new BehaviorSubject<boolean | undefined>(false);
    const { isRelated } = panelIsRelatedByGlobalFilters(useGlobalFilters$);

    expect(isRelated(filterControl(true), [false], [true])).toBe(false);
  });

  test('returns false when sibling does not use global filters', () => {
    const useGlobalFilters$ = new BehaviorSubject<boolean | undefined>(true);
    const { isRelated } = panelIsRelatedByGlobalFilters(useGlobalFilters$);

    expect(isRelated(filterControl(false), [true], [false])).toBe(false);
  });

  test('reacts to sibling useGlobalFilters toggling at runtime', () => {
    const useGlobalFilters$ = new BehaviorSubject<boolean | undefined>(true);
    const sibling = filterControl(true);
    const { isRelated } = panelIsRelatedByGlobalFilters(useGlobalFilters$);

    expect(isRelated(sibling, [true], [true])).toBe(true);
    sibling.useGlobalFilters$.next(false);
    expect(isRelated(sibling, [true], [false])).toBe(false);
  });

  test('reacts to self useGlobalFilters toggling at runtime', () => {
    const useGlobalFilters$ = new BehaviorSubject<boolean | undefined>(false);
    const sibling = filterControl(true);
    const { isRelated } = panelIsRelatedByGlobalFilters(useGlobalFilters$);

    expect(isRelated(sibling, [false], [true])).toBe(false);
    useGlobalFilters$.next(true);
    expect(isRelated(sibling, [true], [true])).toBe(true);
  });
});
