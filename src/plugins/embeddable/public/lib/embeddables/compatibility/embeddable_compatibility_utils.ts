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
import { BehaviorSubject, distinctUntilKeyChanged, map, Subscription } from 'rxjs';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../..';
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
  subscription.add(
    embeddable
      .getInput$()
      .pipe(
        distinctUntilKeyChanged(key, (prev, current) => {
          return deepEqual(prev, current);
        })
      )
      .subscribe(() => subject.next(embeddable.getInput()?.[key] as ValueType))
  );
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
