/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type StreamsUpsertStreamEventPayload,
  streamsUpsertStreamTriggerDefinition,
} from './streams_upsert_stream_trigger';
import type { TriggerEventData } from '../trigger_registry/types';

describe('streamsUpsertStreamTriggerDefinition', () => {
  const createEventData = (
    payload: Partial<StreamsUpsertStreamEventPayload>
  ): TriggerEventData => ({
    type: 'streams.upsertStream',
    payload: {
      streamName: 'logs-test',
      changeTypes: ['mapping'],
      isCreated: false,
      ...payload,
    } as unknown as Record<string, unknown>,
  });

  describe('id and configSchema', () => {
    it('should have the correct trigger id', () => {
      expect(streamsUpsertStreamTriggerDefinition.id).toBe('streams.upsertStream');
    });

    it('should have a valid configSchema', () => {
      expect(streamsUpsertStreamTriggerDefinition.configSchema).toBeDefined();
    });
  });

  describe('matches function', () => {
    describe('without configuration', () => {
      it('should match all stream upsert events when no config is provided', () => {
        const eventData = createEventData({ streamName: 'any-stream' });
        const result = streamsUpsertStreamTriggerDefinition.matches(undefined, eventData);

        expect(result.matches).toBe(true);
        expect(result.workflowInputs).toEqual({
          stream: {
            name: 'any-stream',
            changeTypes: ['mapping'],
            isCreated: false,
            definition: undefined,
          },
        });
      });
    });

    describe('stream pattern matching', () => {
      it('should match exact stream name', () => {
        const config = { stream: 'logs-test' };
        const eventData = createEventData({ streamName: 'logs-test' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should not match different stream name', () => {
        const config = { stream: 'logs-production' };
        const eventData = createEventData({ streamName: 'logs-test' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(false);
      });

      it('should match wildcard pattern at the end', () => {
        const config = { stream: 'logs-*' };
        const eventData = createEventData({ streamName: 'logs-test' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should match wildcard pattern at the beginning', () => {
        const config = { stream: '*-production' };
        const eventData = createEventData({ streamName: 'logs-production' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should match wildcard pattern in the middle', () => {
        const config = { stream: 'logs-*-production' };
        const eventData = createEventData({ streamName: 'logs-web-production' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should match multiple wildcards', () => {
        const config = { stream: '*-*-*' };
        const eventData = createEventData({ streamName: 'logs-web-production' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should match single wildcard for all streams', () => {
        const config = { stream: '*' };
        const eventData = createEventData({ streamName: 'anything-goes' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should not match partial wildcard incorrectly', () => {
        const config = { stream: 'logs-*' };
        const eventData = createEventData({ streamName: 'metrics-test' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(false);
      });

      it('should escape regex special characters in pattern', () => {
        const config = { stream: 'logs.test' };
        const eventData = createEventData({ streamName: 'logs.test' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should not match when pattern has special chars but stream does not', () => {
        const config = { stream: 'logs.test' };
        const eventData = createEventData({ streamName: 'logsXtest' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(false);
      });
    });

    describe('changeTypes filtering', () => {
      it('should match when change type matches', () => {
        const config = { stream: 'logs-*', changeTypes: ['mapping' as const] };
        const eventData = createEventData({
          streamName: 'logs-test',
          changeTypes: ['mapping'],
        });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should match when any change type matches', () => {
        const config = {
          stream: 'logs-*',
          changeTypes: ['mapping' as const, 'processing' as const],
        };
        const eventData = createEventData({
          streamName: 'logs-test',
          changeTypes: ['processing', 'description'],
        });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should not match when no change type matches', () => {
        const config = { stream: 'logs-*', changeTypes: ['mapping' as const] };
        const eventData = createEventData({
          streamName: 'logs-test',
          changeTypes: ['processing', 'description'],
        });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(false);
      });

      it('should match any change when changeTypes is empty', () => {
        const config = { stream: 'logs-*', changeTypes: [] };
        const eventData = createEventData({
          streamName: 'logs-test',
          changeTypes: ['processing'],
        });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });

      it('should match any change when changeTypes is not specified', () => {
        const config = { stream: 'logs-*' };
        const eventData = createEventData({
          streamName: 'logs-test',
          changeTypes: ['description', 'settings'],
        });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
      });
    });

    describe('workflow inputs', () => {
      it('should include stream information in workflow inputs', () => {
        const streamDefinition = { name: 'logs-test', ingest: { processing: [] } };
        const config = { stream: 'logs-*' };
        const eventData = createEventData({
          streamName: 'logs-test',
          changeTypes: ['mapping', 'processing'],
          isCreated: true,
          streamDefinition,
        });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(true);
        expect(result.workflowInputs).toEqual({
          stream: {
            name: 'logs-test',
            changeTypes: ['mapping', 'processing'],
            isCreated: true,
            definition: streamDefinition,
          },
        });
      });

      it('should not include workflow inputs when match fails', () => {
        const config = { stream: 'other-*' };
        const eventData = createEventData({ streamName: 'logs-test' });

        const result = streamsUpsertStreamTriggerDefinition.matches(config, eventData);

        expect(result.matches).toBe(false);
        expect(result.workflowInputs).toBeUndefined();
      });
    });
  });
});
