/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViewMode } from '../../..';
import { BehaviorSubject, type Observable } from 'rxjs';

import { initializeRelatedPanels } from './initialize_related_panels';

interface MockSibling {
  related$?: BehaviorSubject<boolean>;
}

const buildMockParent = ({
  children,
  sectionByUuid = {},
  viewMode = 'edit' as ViewMode,
  childrenLoading = false,
}: {
  children: Record<string, MockSibling>;
  sectionByUuid?: Record<string, string | undefined>;
  viewMode?: ViewMode;
  childrenLoading?: boolean;
}) => {
  const childrenSubjects: Record<string, BehaviorSubject<string | undefined>> = {};
  for (const uuid of Object.keys(children)) {
    childrenSubjects[uuid] = new BehaviorSubject<string | undefined>(sectionByUuid[uuid]);
  }

  return {
    children$: new BehaviorSubject(children),
    childrenLoading$: new BehaviorSubject(childrenLoading),
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

const panel = (): MockSibling => ({});

const flaggedSibling = (related = true): MockSibling & { related$: BehaviorSubject<boolean> } => ({
  related$: new BehaviorSubject(related),
});

describe('initializeRelatedPanels', () => {
  test('does nothing when parent does not publish children', () => {
    const result = initializeRelatedPanels({
      uuid: 'self',
      parentApi: {},
      isRelated: () => true,
    });
    expect(result.relatedPanels$.value).toEqual([]);
  });

  test('lists siblings that pass isRelated', () => {
    const parent = buildMockParent({
      children: {
        self: panel(),
        related: flaggedSibling(true),
        unrelated: flaggedSibling(false),
      },
    });
    const { relatedPanels$ } = initializeRelatedPanels({
      uuid: 'self',
      parentApi: parent,
      isRelated: (sibling) =>
        Boolean((sibling as MockSibling & { related$?: BehaviorSubject<boolean> }).related$?.value),
      siblingDependentObservableNames: ['related$'],
    });

    expect(relatedPanels$.value).toEqual(['related']);
  });

  describe('section scoping', () => {
    test('sectioned panel only lists same-section siblings', () => {
      const parent = buildMockParent({
        children: {
          self: panel(),
          sameSectionPanel: panel(),
          otherSectionPanel: panel(),
          unsectionedPanel: panel(),
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
        isRelated: () => true,
      });

      expect(relatedPanels$.value).toEqual(['sameSectionPanel']);
    });

    test('unsectioned panel reaches panels in any section', () => {
      const parent = buildMockParent({
        children: {
          self: panel(),
          sectionAPanel: panel(),
          sectionBPanel: panel(),
          unsectionedPanel: panel(),
        },
        sectionByUuid: {
          sectionAPanel: 'sectionA',
          sectionBPanel: 'sectionB',
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: () => true,
      });

      expect(relatedPanels$.value.sort()).toEqual([
        'sectionAPanel',
        'sectionBPanel',
        'unsectionedPanel',
      ]);
    });
  });

  describe('reactivity', () => {
    test('emits empty list while view mode is not edit, then recomputes when entering edit', () => {
      const parent = buildMockParent({
        children: {
          self: panel(),
          sibling: panel(),
        },
        viewMode: 'view',
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: () => true,
      });

      expect(relatedPanels$.value).toEqual([]);
      parent.viewMode$.next('edit');
      expect(relatedPanels$.value).toEqual(['sibling']);
    });

    test('emits empty list while children are loading, then recomputes when loading completes', () => {
      const parent = buildMockParent({
        children: {
          self: panel(),
          sibling: panel(),
        },
        childrenLoading: true,
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: () => true,
      });

      expect(relatedPanels$.value).toEqual([]);
      parent.childrenLoading$.next(false);
      expect(relatedPanels$.value).toEqual(['sibling']);
    });

    test('reacts to children being added or removed', () => {
      const parent = buildMockParent({
        children: { self: panel() },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: () => true,
      });

      expect(relatedPanels$.value).toEqual([]);
      parent.children$.next({
        ...parent.children$.value,
        sibling: panel(),
      });
      expect(relatedPanels$.value).toEqual(['sibling']);
    });

    test('reacts to a sibling moving sections', () => {
      const parent = buildMockParent({
        children: { self: panel(), movable: panel() },
        sectionByUuid: { self: 'sectionA', movable: 'sectionA' },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: () => true,
      });

      expect(relatedPanels$.value).toEqual(['movable']);
      parent.setPanelSection('movable', 'sectionB');
      expect(relatedPanels$.value).toEqual([]);
    });

    test('reacts to siblingDependentObservableNames emitting', () => {
      const sibling = flaggedSibling(true);
      const parent = buildMockParent({
        children: { self: panel(), sibling },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: (candidate) =>
          Boolean(
            (candidate as MockSibling & { related$?: BehaviorSubject<boolean> }).related$?.value
          ),
        siblingDependentObservableNames: ['related$'],
      });

      expect(relatedPanels$.value).toEqual(['sibling']);
      sibling.related$.next(false);
      expect(relatedPanels$.value).toEqual([]);
    });

    test('reacts to dependentObservables emitting', () => {
      const selfRelated$ = new BehaviorSubject(true);
      const parent = buildMockParent({
        children: {
          self: panel(),
          sibling: panel(),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: (_sibling, [selfRelated]) => selfRelated,
        dependentObservables: [selfRelated$],
      });

      expect(relatedPanels$.value).toEqual(['sibling']);
      selfRelated$.next(false);
      expect(relatedPanels$.value).toEqual([]);
    });

    test('subscription stops emitting once self is removed from children$', () => {
      const parent = buildMockParent({
        children: {
          self: panel(),
          sibling: panel(),
        },
      });
      const { relatedPanels$ } = initializeRelatedPanels({
        uuid: 'self',
        parentApi: parent,
        isRelated: () => true,
      });

      expect(relatedPanels$.value).toEqual(['sibling']);

      const { self: _removed, ...remaining } = parent.children$.value;
      parent.children$.next(remaining);

      const lastValue = relatedPanels$.value;
      parent.children$.next({ ...remaining, anotherSibling: panel() });
      expect(relatedPanels$.value).toEqual(lastValue);
    });
  });
});
