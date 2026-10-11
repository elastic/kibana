/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod/v4';
import type { ConnectorIngressContext } from '../../connector_spec_events';
import { validateEmittedEvents } from '../../validate_emitted_events';
import { GithubConnector } from './github';
import { githubEvents } from './events';

const createContext = (
  eventType: string,
  rawBody: ConnectorIngressContext['rawBody'],
  headers: ConnectorIngressContext['headers'] = {}
): ConnectorIngressContext => ({
  spaceId: 'default',
  log: loggerMock.create(),
  connectorId: 'github-connector',
  connectorTypeId: '.github',
  config: {},
  rawBody,
  headers: { 'x-github-event': eventType, 'x-github-delivery': 'delivery-123', ...headers },
});

const repository = { id: 1, full_name: 'elastic/example', owner: { login: 'elastic' } };
const sender = { id: 2, login: 'octocat' };

const deliveries = [
  {
    eventType: 'issues',
    body: { action: 'opened', issue: { id: 3, number: 42, title: 'Example', body: null } },
  },
  {
    eventType: 'issue_comment',
    body: { action: 'created', issue: { number: 42 }, comment: { id: 4, body: 'Comment' } },
  },
  {
    eventType: 'pull_request',
    body: {
      action: 'closed',
      pull_request: {
        id: 5,
        number: 43,
        merged: true,
        head: { ref: 'feature' },
        base: { ref: 'main' },
      },
    },
  },
  {
    eventType: 'pull_request_review',
    body: {
      action: 'submitted',
      pull_request: { number: 43 },
      review: { id: 6, state: 'approved', body: null },
    },
  },
  {
    eventType: 'push',
    body: {
      ref: 'refs/heads/main',
      before: 'before-sha',
      after: 'after-sha',
      deleted: true,
      head_commit: null,
      commits: [],
    },
  },
  {
    eventType: 'release',
    body: {
      action: 'published',
      release: { id: 7, tag_name: 'v1.0', name: null, body: null, prerelease: false },
    },
  },
  {
    eventType: 'deployment_status',
    body: {
      deployment: { id: 8, environment: 'production' },
      deployment_status: { id: 9, state: 'failure', creator: null },
    },
  },
  {
    eventType: 'check_run',
    body: {
      action: 'completed',
      check_run: {
        id: 10,
        name: 'test',
        status: 'completed',
        conclusion: 'failure',
        started_at: null,
      },
    },
  },
];

describe('GitHub named events', () => {
  it('registers the eight named event families on the GitHub connector', () => {
    expect(GithubConnector.events).toBe(githubEvents);
    expect(Object.keys(githubEvents.definitions)).toEqual(
      deliveries.map(({ eventType }) => eventType)
    );
    expect(githubEvents.headers).toEqual(['x-github-event', 'x-github-delivery']);
  });

  it.each(deliveries)(
    'emits one $eventType event with its resource, repository, and actor',
    async ({ eventType, body }) => {
      const rawBody = { ...body, repository, sender, extra: { preserved: true } };
      const result = await githubEvents.handleEvents(createContext(eventType, rawBody));
      expect(result).toEqual({
        type: 'emit',
        events: [
          {
            eventId: `github.${eventType}`,
            correlationKey: 'delivery-123',
            payload: { eventType, body: rawBody },
          },
        ],
      });
      if (result.type !== 'emit') {
        throw new Error('Expected an emitted event');
      }
      expect(validateEmittedEvents(githubEvents.definitions, result.events)).toEqual({ ok: true });
    }
  );

  it.each([
    ['issues', 'opened'],
    ['issues', 'edited'],
    ['issues', 'reopened'],
    ['issues', 'closed'],
    ['issue_comment', 'created'],
    ['issue_comment', 'edited'],
    ['issue_comment', 'deleted'],
    ['pull_request', 'opened'],
    ['pull_request', 'edited'],
    ['pull_request', 'synchronize'],
    ['pull_request', 'reopened'],
    ['pull_request', 'closed'],
  ])('retains the %s lifecycle action %s', async (eventType, action) => {
    const result = await githubEvents.handleEvents(createContext(eventType, { action }));
    expect(result).toMatchObject({
      type: 'emit',
      events: [{ eventId: `github.${eventType}`, payload: { body: { action } } }],
    });
  });

  it.each([
    ['issues', { issue: { number: 1, user: null, labels: [null] } }],
    ['issue_comment', { comment: { id: 1, user: null } }],
    ['pull_request', { pull_request: { number: 1, user: null, merged: null } }],
    ['pull_request_review', { action: 'submitted', review: { id: 1, user: null } }],
    ['push', { pusher: { name: 'octocat', email: null }, repository: { owner: null } }],
    ['release', { action: 'published', release: { id: 1, author: null } }],
  ])('accepts the null values GitHub sends in %s', (eventType, body) => {
    expect(
      githubEvents.definitions[eventType].eventSchema.safeParse({ eventType, body }).success
    ).toBe(true);
  });

  it('accepts text longer than 65,536 characters', () => {
    const body = { action: 'published', release: { id: 1, body: 'r'.repeat(125_000) } };
    expect(
      githubEvents.definitions.release.eventSchema.safeParse({ eventType: 'release', body }).success
    ).toBe(true);
  });

  it('emits a schema-invalid payload so the hub rejects and logs it', async () => {
    const result = await githubEvents.handleEvents(
      createContext('pull_request', { pull_request: { merged: 'yes' } })
    );
    if (result.type !== 'emit') {
      throw new Error('Expected an emitted event');
    }
    expect(result.events).toHaveLength(1);
    expect(validateEmittedEvents(githubEvents.definitions, result.events).ok).toBe(false);
  });

  it.each([
    ['pull_request_review', 'edited'],
    ['pull_request_review', 'dismissed'],
    ['release', 'created'],
    ['release', 'edited'],
    ['check_run', 'created'],
    ['check_run', 'rerequested'],
  ])('does not emit %s for action %s', async (eventType, action) => {
    expect(await githubEvents.handleEvents(createContext(eventType, { action }))).toEqual({
      type: 'emit',
      events: [],
    });
  });

  it.each(['ping', 'fork', 'check_suite', 'constructor', '__proto__'])(
    'does not invent a named event for %s',
    async (eventType) => {
      expect(
        await githubEvents.handleEvents(
          createContext(eventType, { action: 'opened', issue: { number: 1 } })
        )
      ).toEqual({ type: 'emit', events: [] });
    }
  );

  it.each([null, [], 'payload', 42])('does not emit for a non-object payload: %p', async (body) => {
    expect(await githubEvents.handleEvents(createContext('issues', body))).toEqual({
      type: 'emit',
      events: [],
    });
  });

  it.each([
    ['issues', { action: 'opened', issue: { number: 1 } }],
    ['release', { action: 'published', release: { id: 1 } }],
  ])('emits %s from a form-encoded payload', async (eventType, body) => {
    const result = await githubEvents.handleEvents(
      createContext(eventType, { payload: JSON.stringify(body) })
    );
    expect(result).toEqual({
      type: 'emit',
      events: [
        {
          eventId: `github.${eventType}`,
          correlationKey: 'delivery-123',
          payload: { eventType, body },
        },
      ],
    });
  });

  it.each(['not json', '[]', 'null'])(
    'does not emit for a form-encoded payload that is not a JSON object: %p',
    async (payload) => {
      expect(await githubEvents.handleEvents(createContext('issues', { payload }))).toEqual({
        type: 'emit',
        events: [],
      });
    }
  );

  it.each([
    { 'x-github-event': undefined },
    { 'x-github-event': ['issues', 'push'] },
    { 'x-github-event': 'i'.repeat(257) },
    { 'x-github-delivery': ['one', 'two'] },
    { 'x-github-delivery': 'd'.repeat(129) },
  ])('does not emit for invalid delivery headers: %p', async (headers) => {
    expect(await githubEvents.handleEvents(createContext('issues', {}, headers))).toEqual({
      type: 'emit',
      events: [],
    });
  });

  it('creates a correlation key when the delivery ID is absent', async () => {
    const result = await githubEvents.handleEvents(
      createContext('issues', {}, { 'x-github-delivery': undefined })
    );
    expect(result).toMatchObject({ events: [{ correlationKey: expect.any(String) }] });
  });

  it('retains extra nested fields and accepts absent optional fields', () => {
    const schema = githubEvents.definitions.pull_request.eventSchema;
    const payload = {
      eventType: 'pull_request',
      body: { pull_request: { merged: true, custom: { value: 1 } } },
    };
    expect(schema.parse(payload)).toEqual(payload);
    expect(schema.safeParse({ eventType: 'pull_request', body: {} }).success).toBe(true);
    expect(
      schema.safeParse({ eventType: 'pull_request', body: { pull_request: { merged: 'yes' } } })
        .success
    ).toBe(false);
  });

  it('exposes nested fields and flexible objects in the editor JSON schema', () => {
    expect(z.toJSONSchema(githubEvents.definitions.pull_request.eventSchema)).toMatchObject({
      properties: {
        body: {
          additionalProperties: {},
          properties: {
            action: { type: 'string' },
            repository: { properties: { full_name: { type: 'string' } } },
            sender: { properties: { login: { type: 'string' } } },
            pull_request: {
              properties: {
                number: { type: 'integer' },
                merged: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
              },
            },
          },
        },
      },
    });
  });
});
