/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getConnectorSpec } from '../../get_connector_spec';
import { buildEventId } from '../../event_type_id';
import { SPECS_ALLOWED_EVENTS } from '../../specs_allowed_events';
import { validateEmittedEvents } from '../../validate_emitted_events';
import type { ConnectorIngressContext, HandleEventsResult } from '../../connector_spec_events';
import { InboundWebhook } from './inbound_webhook';
import {
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  INBOUND_WEBHOOK_RECEIVED_EVENT_ID,
  INBOUND_WEBHOOK_RECEIVED_EVENT_KEY,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
} from './constants';

describe('InboundWebhook', () => {
  it('is discoverable via getConnectorSpec (all_specs wiring)', () => {
    expect(getConnectorSpec(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID)).toBe(InboundWebhook);
  });

  it('has inbound-only metadata', () => {
    expect(InboundWebhook.metadata.id).toBe('.inboundWebhook');
    expect(InboundWebhook.metadata.isTechnicalPreview).toBe(true);
    expect(InboundWebhook.metadata.supportedFeatureIds).toEqual(['workflows']);
    expect(InboundWebhook.metadata.minimumLicense).toBe('gold');
    expect(InboundWebhook.metadata.icon).toBe('plugs');
    expect(Object.keys(InboundWebhook.actions)).toEqual([]);
    expect(InboundWebhook.test.enabled).toBe(false);
  });

  it('does not declare ingestTokenHash (factory injects it)', () => {
    expect(InboundWebhook.schema?.shape).not.toHaveProperty('ingestTokenHash');
  });

  it('is allowlisted to declare events', () => {
    expect(SPECS_ALLOWED_EVENTS.has(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID)).toBe(true);
    expect(InboundWebhook.events).toBeDefined();
  });

  it('uses buildEventId for the received event', () => {
    const received = InboundWebhook.events?.definitions[INBOUND_WEBHOOK_RECEIVED_EVENT_KEY];
    expect(received?.eventId).toBe(INBOUND_WEBHOOK_RECEIVED_EVENT_ID);
    expect(received?.eventId).toBe(
      buildEventId(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID, INBOUND_WEBHOOK_RECEIVED_EVENT_KEY)
    );
    expect(INBOUND_WEBHOOK_RECEIVED_EVENT_ID).toBe('inboundWebhook.received');
  });

  describe('handleEvents', () => {
    const { events } = InboundWebhook;
    if (events === undefined) {
      throw new Error('InboundWebhook must declare events');
    }

    const createContext = (rawBody: unknown): ConnectorIngressContext => ({
      spaceId: 'default',
      log: loggerMock.create(),
      connectorId: 'sales-ingress',
      connectorTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
      config: {},
      rawBody,
    });

    const expectEmit = (result: HandleEventsResult) => {
      expect(result.type).toBe('emit');
      if (result.type !== 'emit') {
        throw new Error('expected emit');
      }
      return result;
    };

    it('emits inboundWebhook.received with body and a correlationKey', async () => {
      const rawBody = { eventType: 'order.created', orderId: '1' };
      const result = expectEmit(await events.handleEvents(createContext(rawBody)));

      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventId).toBe('inboundWebhook.received');
      expect(result.events[0].correlationKey).toEqual(expect.any(String));
      expect(result.events[0].correlationKey.length).toBeGreaterThan(0);
      expect(result.events[0].payload).toEqual({
        body: rawBody,
      });
      expect(validateEmittedEvents(events.definitions, result.events)).toEqual({
        ok: true,
      });
    });

    it('assigns a distinct correlationKey per request', async () => {
      const ctx = createContext({ ping: true });
      const first = expectEmit(await events.handleEvents(ctx));
      const second = expectEmit(await events.handleEvents(ctx));

      expect(first.events[0].correlationKey).not.toBe(second.events[0].correlationKey);
    });

    it('passes through a non-object body unchanged', async () => {
      const result = expectEmit(await events.handleEvents(createContext('plain-text')));

      expect(result.events[0].payload).toEqual({ body: 'plain-text' });
    });

    const expectHttpAck = (result: HandleEventsResult, challenge: string) => {
      expect(result).toEqual({
        type: 'http',
        httpResponse: { status: 200, body: { challenge } },
      });
    };

    it('acks a top-level challenge without emitting', async () => {
      expectHttpAck(await events.handleEvents(createContext({ challenge: 'ping-1' })), 'ping-1');
    });

    it('acks a top-level challenge when sibling keys are present', async () => {
      expectHttpAck(
        await events.handleEvents(
          createContext({ type: 'ping', token: 'ignored', challenge: 'abc' })
        ),
        'abc'
      );
    });

    it('emits when challenge is only nested', async () => {
      const rawBody = { payload: { challenge: 'nested' } };
      const result = expectEmit(await events.handleEvents(createContext(rawBody)));
      expect(result.events[0].payload).toEqual({ body: rawBody });
    });

    it('emits when the challenge string is empty or too long', async () => {
      expectEmit(await events.handleEvents(createContext({ challenge: '' })));
      expectEmit(
        await events.handleEvents(
          createContext({ challenge: 'x'.repeat(MAX_HANDSHAKE_CHALLENGE_LENGTH + 1) })
        )
      );
    });

    it('does not log the raw body at info', async () => {
      const log = loggerMock.create();
      await events.handleEvents({
        ...createContext({ challenge: 'ping-1', token: 'should-not-be-logged' }),
        log,
      });
      await events.handleEvents({
        ...createContext({ eventType: 'order.created' }),
        log,
      });
      expect(log.info).not.toHaveBeenCalled();
    });
  });
});
