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
import type { ViewMode } from '../../..';
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
      isFilterControl: true,
    });
    expect(result.relatedPanels$.value).toEqual([]);
  });

  describe('filter controls', () => {
    test('list other panels, time controls, and filter controls whose useGlobalFilters is true', () => {
      const parent = buildMockParent({
        children: {
          self: filterControl('self', false),
          globalReader: filterControl('globalReader', true),
          standaloneReader: filterControl('standaloneReader', false),
          timeSlider: timeSlider('timeSlider'),
          panel: panel('panel'),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value.sort()).toEqual(['globalReader', 'panel', 'timeSlider']);
    });

    test('react to sibling useGlobalFilters toggling at runtime', () => {
      const reader = filterControl('reader', true);
      const parent = buildMockParent({
        children: {
          self: filterControl('self', true),
          reader,
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value).toEqual(['reader']);
      reader.useGlobalFilters$!.next(false);
      expect(relatedPanels$.value).toEqual([]);
    });

    test('sectioned control only lists same-section panels and unsectioned controls', () => {
      const parent = buildMockParent({
        children: {
          self: filterControl('self'),
          sameSectionPanel: panel('sameSectionPanel'),
          otherSectionPanel: panel('otherSectionPanel'),
          unsectionedPanel: panel('unsectionedPanel'),
          unsectionedTimeSlider: timeSlider('unsectionedTimeSlider'),
        },
        sectionByUuid: {
          self: 'sectionA',
          sameSectionPanel: 'sectionA',
          otherSectionPanel: 'sectionB',
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value.sort()).toEqual(['sameSectionPanel', 'unsectionedTimeSlider']);
    });

    test('unsectioned control reaches panels in any section', () => {
      const parent = buildMockParent({
        children: {
          self: filterControl('self'),
          sectionAPanel: panel('sectionAPanel'),
          sectionBPanel: panel('sectionBPanel'),
          unsectionedPanel: panel('unsectionedPanel'),
        },
        sectionByUuid: {
          sectionAPanel: 'sectionA',
          sectionBPanel: 'sectionB',
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value.sort()).toEqual([
        'sectionAPanel',
        'sectionBPanel',
        'unsectionedPanel',
      ]);
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
        isESQLControl: true,
        esqlVariable$: self.esqlVariable$!,
      });
      expect(relatedPanels$.value).toEqual(['usingPanel']);
    });
  });

  describe('reactivity', () => {
    test('emits empty list while view mode is not edit, then recomputes when entering edit', () => {
      const parent = buildMockParent({
        children: {
          self: filterControl('self'),
          panel: panel('panel'),
        },
        viewMode: 'view',
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value).toEqual([]);
      parent.viewMode$.next('edit');
      expect(relatedPanels$.value).toEqual(['panel']);
    });

    test('reacts to children being added or removed', () => {
      const parent = buildMockParent({
        children: { self: filterControl('self') },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value).toEqual([]);
      parent.children$.next({
        ...parent.children$.value,
        panel: panel('panel'),
      });
      expect(relatedPanels$.value).toEqual(['panel']);
    });

    test('reacts to a sibling moving sections', () => {
      const movable = panel('movable');
      const parent = buildMockParent({
        children: { self: filterControl('self'), movable },
        sectionByUuid: { self: 'sectionA', movable: 'sectionA' },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value).toEqual(['movable']);
      parent.setPanelSection('movable', 'sectionB');
      expect(relatedPanels$.value).toEqual([]);
    });

    test('subscription stops emitting once self is removed from children$', () => {
      const parent = buildMockParent({
        children: {
          self: filterControl('self'),
          panel: panel('panel'),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isFilterControl: true,
      });
      expect(relatedPanels$.value).toEqual(['panel']);

      const { self: _removed, ...remaining } = parent.children$.value;
      parent.children$.next(remaining);

      const lastValue = relatedPanels$.value;
      parent.children$.next({ ...remaining, anotherPanel: panel('anotherPanel') });
      expect(relatedPanels$.value).toEqual(lastValue);
    });
  });
});
