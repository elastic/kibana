/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject, distinctUntilKeyChanged, map, Subscription } from 'rxjs';
import { Container } from '../../containers';
import { ViewMode as LegacyViewMode } from '../../types';
import {
  CommonLegacyEmbeddable,
  CommonLegacyInput,
  CommonLegacyOutput,
} from './legacy_embeddable_to_api';

export const embeddableInputToSubject = <T extends unknown = unknown>(
  subscription: Subscription,
  embeddable: CommonLegacyEmbeddable,
  key: keyof CommonLegacyInput
) => {
  const subject = new BehaviorSubject<T | undefined>(embeddable.getExplicitInput()?.[key] as T);
  subscription.add(
    embeddable
      .getInput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => subject.next(embeddable.getInput()?.[key] as T))
  );
  return subject;
};

export const embeddableOutputToSubject = <T extends unknown = unknown>(
  subscription: Subscription,
  embeddable: CommonLegacyEmbeddable,
  key: keyof CommonLegacyOutput
) => {
  const subject = new BehaviorSubject<T | undefined>(embeddable.getOutput()[key] as T);
  subscription.add(
    embeddable
      .getOutput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => subject.next(embeddable.getOutput()[key] as T))
  );
  return subject;
};

export const mapLegacyViewModeToViewMode = (legacyViewMode?: LegacyViewMode): ViewMode => {
  if (!legacyViewMode) return 'view';
  switch (legacyViewMode) {
    case LegacyViewMode.VIEW: {
      return 'view';
    }
    case LegacyViewMode.EDIT: {
      return 'edit';
    }
    case LegacyViewMode.PREVIEW: {
      return 'preview';
    }
    case LegacyViewMode.PRINT: {
      return 'print';
    }
    default: {
      return 'view';
    }
  }
};

export const viewModeToSubject = (
  subscription: Subscription,
  embeddable: CommonLegacyEmbeddable
) => {
  const subject = new BehaviorSubject<ViewMode>(
    mapLegacyViewModeToViewMode(embeddable.getInput().viewMode)
  );
  subscription.add(
    embeddable
      .getInput$()
      .pipe(
        distinctUntilKeyChanged('viewMode'),
        map(({ viewMode }) => mapLegacyViewModeToViewMode(viewMode))
      )
      .subscribe((viewMode: ViewMode) => subject.next(viewMode))
  );
  return subject;
};

/**
 * Temporarily copying types from dashboard_container.ts because we cannot import it here.
 */
interface DashboardRequiredMethods {
  getExpandedPanelId: () => string | undefined;
  setExpandedPanelId: (expandedPanelId: string | undefined) => void;
}

export const hasDashboardRequiredMethods = (
  container: unknown
): container is DashboardRequiredMethods & Container => {
  return (
    typeof (container as DashboardRequiredMethods).getExpandedPanelId === 'function' &&
    typeof (container as DashboardRequiredMethods).setExpandedPanelId === 'function'
  );
};
