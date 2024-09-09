/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ViewMode } from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import {
  BehaviorSubject,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  map,
  Subscription,
} from 'rxjs';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../..';
import { Container } from '../../containers';
import { ViewMode as LegacyViewMode } from '../../types';
import { CommonLegacyEmbeddable } from './legacy_embeddable_to_api';

export const embeddableInputToSubject = <
  ValueType extends unknown = unknown,
  LegacyInput extends EmbeddableInput = EmbeddableInput
>(
  subscription: Subscription,
  embeddable: IEmbeddable<LegacyInput>,
  key: keyof LegacyInput,
  useExplicitInput = false
) => {
  const subject = new BehaviorSubject<ValueType | undefined>(
    embeddable.getExplicitInput()?.[key] as ValueType
  );
  if (useExplicitInput && embeddable.parent) {
    subscription.add(
      embeddable.parent
        .getInput$()
        .pipe(
          distinctUntilChanged((prev, current) => {
            const previousValue = (prev.panels[embeddable.id]?.explicitInput as LegacyInput)[key];
            const currentValue = (current.panels[embeddable.id]?.explicitInput as LegacyInput)?.[
              key
            ];
            return deepEqual(previousValue, currentValue);
          })
        )
        .subscribe(() => subject.next(embeddable.getExplicitInput()?.[key] as ValueType))
    );
  } else {
    subscription.add(
      embeddable
        .getInput$()
        .pipe(distinctUntilKeyChanged(key))
        .subscribe(() => subject.next(embeddable.getInput()?.[key] as ValueType))
    );
  }
  return subject;
};

export const embeddableOutputToSubject = <
  ValueType extends unknown = unknown,
  LegacyOutput extends EmbeddableOutput = EmbeddableOutput
>(
  subscription: Subscription,
  embeddable: IEmbeddable<EmbeddableInput, LegacyOutput>,
  key: keyof LegacyOutput
) => {
  const subject = new BehaviorSubject<ValueType | undefined>(
    embeddable.getOutput()[key] as ValueType
  );
  subscription.add(
    embeddable
      .getOutput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => subject.next(embeddable.getOutput()[key] as ValueType))
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
