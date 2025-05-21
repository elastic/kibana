/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@kbn/i18n';
import { StateComparators } from '@kbn/presentation-publishing';

import { DashboardSectionMap } from '../../common';
import { DashboardState } from './types';

export function initializeSectionsManager(initialSections: DashboardSectionMap | undefined) {
  const scrollToBottom$ = new Subject<void>();
  const sections$ = new BehaviorSubject<DashboardSectionMap | undefined>(initialSections);
  function setSections(sections?: DashboardSectionMap) {
    if (!fastIsEqual(sections ?? {}, sections$.value ?? {})) sections$.next(sections);
  }

  return {
    api: {
      sections$,
      addNewSection: () => {
        const oldSections = sections$.getValue() ?? {};
        const newId = uuidv4();
        setSections({
          ...oldSections,
          [newId]: {
            id: newId,
            order: Object.keys(oldSections).length + 1,
            title: i18n.translate('dashboard.defaultSectionTitle', {
              defaultMessage: 'New collapsible section',
            }),
            collapsed: false,
          },
        });

        // scroll to bottom after row is added
        scrollToBottom$.next();
      },
      setSections,
    },
    comparators: {
      sections: [
        sections$,
        setSections,
        (a, b) => {
          return fastIsEqual(a ?? {}, b ?? {});
        },
      ],
    } as StateComparators<Pick<DashboardState, 'sections'>>,
    internalApi: {
      scrollToBottom$,
      scrollToBottom: () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      },
      getState: (): DashboardState['sections'] => {
        return sections$.getValue();
      },
      reset: (lastSavedState: DashboardState) => {
        setSections(lastSavedState.sections);
      },
      isSectionCollapsed: (id?: string) => {
        if (!id) return false; // this is the first section and it cannot be collapsed
        return Boolean(sections$.getValue()?.[id]?.collapsed);
      },
    },
  };
}
