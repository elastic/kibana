/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject, type Observable } from 'rxjs';

import { initializeRelatedPanels } from './initialize_related_panels';

interface MockChild {
  uuid: string;
  appliedFilters$?: BehaviorSubject<Filter[] | undefined>;
  appliedTimeslice$?: BehaviorSubject<[number, number] | undefined>;
  useGlobalFilters$?: BehaviorSubject<boolean | undefined>;
  esqlVariable$?: BehaviorSubject<ESQLControlVariable>;
  query$?: BehaviorSubject<AggregateQuery | undefined>;
}

const buildMockParent = ({
  children,
  sectionByUuid = {},
  viewMode = 'edit' as ViewMode,
}: {
  children: Record<string, MockChild>;
  sectionByUuid?: Record<string, string | undefined>;
  viewMode?: ViewMode;
}) => {
  const childrenSubjects: Record<string, BehaviorSubject<string | undefined>> = {};
  for (const uuid of Object.keys(children)) {
    childrenSubjects[uuid] = new BehaviorSubject<string | undefined>(sectionByUuid[uuid]);
  }

  return {
    children$: new BehaviorSubject(children),
    viewMode$: new BehaviorSubject<ViewMode>(viewMode),
    getPanelSection: (uuid: string) => sectionByUuid[uuid],
    panelSection$: (uuid: string): Observable<string | undefined> =>
      childrenSubjects[uuid] ?? new BehaviorSubject<string | undefined>(undefined),
    setPanelSection: (uuid: string, section: string | undefined) => {
      sectionByUuid[uuid] = section;
      childrenSubjects[uuid]?.next(section);
    },
  };
};

const filterControl = (uuid: string, useGlobalFilters = true): MockChild => ({
  uuid,
  appliedFilters$: new BehaviorSubject<Filter[] | undefined>(undefined),
  useGlobalFilters$: new BehaviorSubject<boolean | undefined>(useGlobalFilters),
});

const timeSlider = (uuid: string): MockChild => ({
  uuid,
  appliedTimeslice$: new BehaviorSubject<[number, number] | undefined>([0, 1]),
});

const esqlControl = (uuid: string, variableKey = 'variable'): MockChild => ({
  uuid,
  esqlVariable$: new BehaviorSubject<ESQLControlVariable>({
    key: variableKey,
  } as ESQLControlVariable),
});

const esqlPanel = (uuid: string, esql: string): MockChild => ({
  uuid,
  query$: new BehaviorSubject<AggregateQuery | undefined>({ esql }),
});

const panel = (uuid: string): MockChild => ({ uuid });

describe('initializeRelatedPanels', () => {
  test('does nothing when parent does not publish children', () => {
    const result = initializeRelatedPanels({
      uuid: 'self',
      parentApi: {},
      api: panel('self'),
    });
    expect(result.relatedPanels$.value).toEqual([]);
  });

  describe('non-control panels', () => {
    test('list filter controls and time slider in compatible scope', () => {
      const parent = buildMockParent({
        children: {
          self: panel('self'),
          filter: filterControl('filter'),
          timeSlider: timeSlider('timeSlider'),
          otherPanel: panel('otherPanel'),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: parent.children$.value.self,
      });
      expect(relatedPanels$.value.sort()).toEqual(['filter', 'timeSlider']);
    });

    test('add ES|QL controls whose variable my query references', () => {
      const parent = buildMockParent({
        children: {
          self: esqlPanel('self', 'FROM index | WHERE field == ?variable'),
          relevantControl: esqlControl('relevantControl', 'variable'),
          irrelevantControl: esqlControl('irrelevantControl', 'otherVariable'),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: parent.children$.value.self,
      });
      expect(relatedPanels$.value).toEqual(['relevantControl']);
    });

    test('panel in a section only lists controls in compatible scope', () => {
      const parent = buildMockParent({
        children: {
          self: panel('self'),
          globalControl: filterControl('globalControl'),
          sameSectionControl: filterControl('sameSectionControl'),
          otherSectionControl: filterControl('otherSectionControl'),
        },
        sectionByUuid: {
          self: 'sectionA',
          sameSectionControl: 'sectionA',
          otherSectionControl: 'sectionB',
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: parent.children$.value.self,
      });
      expect(relatedPanels$.value.sort()).toEqual(['globalControl', 'sameSectionControl']);
    });
  });

  describe('filter controls', () => {
    test('list other panels, and other filter/time controls whose useGlobalFilters is true', () => {
      const self = filterControl('self', false);
      const parent = buildMockParent({
        children: {
          self,
          globalReader: filterControl('globalReader', true),
          standaloneReader: filterControl('standaloneReader', false),
          timeSlider: timeSlider('timeSlider'),
          panel: panel('panel'),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value.sort()).toEqual(['globalReader', 'panel', 'timeSlider']);
    });

    test('react to sibling useGlobalFilters toggling at runtime', () => {
      const self = filterControl('self', true);
      const reader = filterControl('reader', true);
      const parent = buildMockParent({
        children: {
          self,
          reader,
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value).toEqual(['reader']);
      reader.useGlobalFilters$!.next(false);
      expect(relatedPanels$.value).toEqual([]);
    });
  });

  describe('ES|QL controls', () => {
    test('list ES|QL panels whose query consumes my variable', () => {
      const self = esqlControl('self', 'myVar');
      const parent = buildMockParent({
        children: {
          self,
          usingPanel: esqlPanel('usingPanel', 'FROM logs | WHERE level == ?myVar'),
          unrelatedPanel: esqlPanel('unrelatedPanel', 'FROM logs | WHERE level == ?other'),
          plainPanel: panel('plainPanel'),
          siblingControl: esqlControl('siblingControl', 'siblingVar'),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value).toEqual(['usingPanel']);
    });
  });

  describe('reactivity', () => {
    test('emits empty list while view mode is not edit, then recomputes when entering edit', () => {
      const self = panel('self');
      const parent = buildMockParent({
        children: { self, filter: filterControl('filter') },
        viewMode: 'view',
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value).toEqual([]);
      parent.viewMode$.next('edit');
      expect(relatedPanels$.value).toEqual(['filter']);
    });

    test('reacts to children being added or removed', () => {
      const self = panel('self');
      const parent = buildMockParent({
        children: { self },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value).toEqual([]);
      parent.children$.next({
        ...parent.children$.value,
        filter: filterControl('filter'),
      });
      expect(relatedPanels$.value).toEqual(['filter']);
    });

    test('reacts to a sibling moving sections', () => {
      const self = panel('self');
      const movable = filterControl('movable');
      const parent = buildMockParent({
        children: { self, movable },
        sectionByUuid: { self: 'sectionA', movable: 'sectionA' },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value).toEqual(['movable']);
      parent.setPanelSection('movable', 'sectionB');
      expect(relatedPanels$.value).toEqual([]);
    });

    test('subscription stops emitting once self is removed from children$', () => {
      const self = panel('self');
      const parent = buildMockParent({
        children: { self, filter: filterControl('filter') },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        api: self,
      });
      expect(relatedPanels$.value).toEqual(['filter']);

      const { self: _removed, ...remaining } = parent.children$.value;
      parent.children$.next(remaining);

      const lastValue = relatedPanels$.value;
      parent.children$.next({ ...remaining, anotherFilter: filterControl('anotherFilter') });
      expect(relatedPanels$.value).toEqual(lastValue);
    });
  });
});
