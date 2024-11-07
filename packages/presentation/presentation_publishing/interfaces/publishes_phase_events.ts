/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  phase$: PublishingSubject<PhaseEvent | undefined>;
}

export const apiPublishesPhaseEvents = (
  unknownApi: null | unknown
): unknownApi is PublishesPhaseEvents => {
  return Boolean(unknownApi && (unknownApi as PublishesPhaseEvents)?.phase$ !== undefined);
};
