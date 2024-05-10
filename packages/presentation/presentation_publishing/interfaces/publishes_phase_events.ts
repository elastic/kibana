/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ErrorLike } from '@kbn/expressions-plugin/common';
import { PublishingSubject } from '../publishing_subject';

/** ------------------------------------------------------------------------------------------
 * Performance Tracking Types
 * ------------------------------------------------------------------------------------------ */
export type PhaseEventType = 'loading' | 'loaded' | 'rendered' | 'error';
export interface PhaseEvent {
  id: string;
  status: PhaseEventType;
  error?: ErrorLike;
  timeToEvent: number;
}

export interface PublishesPhaseEvents {
  onPhaseChange: PublishingSubject<PhaseEvent | undefined>;
}

export const apiPublishesPhaseEvents = (
  unknownApi: null | unknown
): unknownApi is PublishesPhaseEvents => {
  return Boolean(unknownApi && (unknownApi as PublishesPhaseEvents)?.onPhaseChange !== undefined);
};
