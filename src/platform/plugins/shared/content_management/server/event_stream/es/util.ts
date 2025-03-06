/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mutable } from 'utility-types';
import type { EventStreamEvent } from '../types';
import type { EsEventStreamEventDto } from './types';

export const eventToDto = (event: EventStreamEvent): EsEventStreamEventDto => {
  const { time, subject, predicate, object, transaction } = event;

  const dto: EsEventStreamEventDto = {
    '@timestamp': new Date(time).toISOString(),
    predicate: predicate[0],
  };

  if (subject) {
    dto.subjectType = subject[0];
    dto.subjectId = subject[1];
  }

  if (predicate[1]) {
    dto.payload = predicate[1];
  }

  if (object) {
    dto.objectType = object[0];
    dto.objectId = object[1];
  }

  if (transaction) {
    dto.txId = transaction;
  }

  return dto;
};

export const dtoToEvent = (dto: EsEventStreamEventDto): EventStreamEvent => {
  const {
    '@timestamp': timestamp,
    subjectType,
    subjectId,
    predicate,
    payload,
    objectId,
    objectType,
    txId,
  } = dto;

  const event: Mutable<EventStreamEvent> = {
    time: new Date(timestamp).getTime(),
    predicate: payload ? [predicate, payload] : [predicate],
  };

  if (subjectType && subjectId) {
    event.subject = [subjectType, subjectId];
  }

  if (objectType && objectId) {
    event.object = [objectType, objectId];
  }

  if (txId) {
    event.transaction = txId;
  }

  return event;
};
