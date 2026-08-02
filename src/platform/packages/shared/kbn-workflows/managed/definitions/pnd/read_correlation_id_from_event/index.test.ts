/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readCorrelationIdFromEvent, readCorrelationIdFromExecutionContext } from '.';

describe('readCorrelationIdFromEvent', () => {
  it('prefers the mapped correlationId', () => {
    expect(
      readCorrelationIdFromEvent({
        attackDiscoveryAlertId: 'producer-1',
        correlationId: 'mapped-1',
      })
    ).toBe('mapped-1');
  });

  it('falls back to the producer alert id when correlationId is absent', () => {
    expect(readCorrelationIdFromEvent({ attackDiscoveryAlertId: 'producer-1' })).toBe('producer-1');
  });

  it('falls back when correlationId is blank', () => {
    expect(
      readCorrelationIdFromEvent({
        attackDiscoveryAlertId: 'producer-1',
        correlationId: '   ',
      })
    ).toBe('producer-1');
  });

  it('returns empty when neither field is a nonempty string', () => {
    expect(readCorrelationIdFromEvent({})).toBe('');
  });

  it('returns empty when the event is undefined', () => {
    expect(readCorrelationIdFromEvent(undefined)).toBe('');
  });

  it('falls back to the first attack_discovery evidence ref', () => {
    expect(
      readCorrelationIdFromEvent({
        evidenceRefs: [
          { id: '8aaad3c6-7685-57c8-aa8b-999fb9dda2d8', kind: 'conversation' },
          {
            id: 'd8e335797e028e48136b833f8fdfbfd050255c18e765514af6bac2af17f03c66',
            kind: 'attack_discovery',
          },
        ],
      })
    ).toBe('d8e335797e028e48136b833f8fdfbfd050255c18e765514af6bac2af17f03c66');
  });

  it('prefers the producer alert id over an evidence ref', () => {
    expect(
      readCorrelationIdFromEvent({
        attackDiscoveryAlertId: 'producer-1',
        evidenceRefs: [{ id: 'from-ref', kind: 'attack_discovery' }],
      })
    ).toBe('producer-1');
  });

  it('prefers the mapped correlationId over an evidence ref', () => {
    expect(
      readCorrelationIdFromEvent({
        correlationId: 'mapped-1',
        evidenceRefs: [{ id: 'from-ref', kind: 'attack_discovery' }],
      })
    ).toBe('mapped-1');
  });

  it('returns empty when evidence refs name no attack_discovery', () => {
    expect(
      readCorrelationIdFromEvent({
        evidenceRefs: [{ id: 'hunt-1', kind: 'hunt_finding' }],
      })
    ).toBe('');
  });

  it('returns empty when evidence refs is not an array', () => {
    expect(
      readCorrelationIdFromEvent({ evidenceRefs: { id: 'ad-1', kind: 'attack_discovery' } })
    ).toBe('');
  });

  it('skips an attack_discovery ref whose id is blank', () => {
    expect(
      readCorrelationIdFromEvent({
        evidenceRefs: [
          { id: '   ', kind: 'attack_discovery' },
          { id: 'ad-2', kind: 'attack_discovery' },
        ],
      })
    ).toBe('ad-2');
  });
});

describe('readCorrelationIdFromExecutionContext', () => {
  it('reads through context.event', () => {
    expect(
      readCorrelationIdFromExecutionContext({
        event: { attackDiscoveryAlertId: 'producer-1' },
      })
    ).toBe('producer-1');
  });

  it('returns empty when context has no event object', () => {
    expect(readCorrelationIdFromExecutionContext({})).toBe('');
  });

  it('returns empty when context is undefined', () => {
    expect(readCorrelationIdFromExecutionContext(undefined)).toBe('');
  });

  it('reads an attack_discovery evidence ref through context.event', () => {
    expect(
      readCorrelationIdFromExecutionContext({
        event: {
          evidenceRefs: [{ id: 'ad-from-claim', kind: 'attack_discovery' }],
        },
      })
    ).toBe('ad-from-claim');
  });
});
