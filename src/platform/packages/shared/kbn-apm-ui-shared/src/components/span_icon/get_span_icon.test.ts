/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SVGs resolve to the same stub in Jest, so give each asserted icon a unique value.
jest.mock('./icons/cassandra.svg', () => 'cassandra.svg', { virtual: true });
jest.mock('./icons/cassandra_dark.svg', () => 'cassandra_dark.svg', { virtual: true });
jest.mock('./icons/database.svg', () => 'database.svg', { virtual: true });
jest.mock('./icons/database_dark.svg', () => 'database_dark.svg', { virtual: true });
jest.mock('./icons/default.svg', () => 'default.svg', { virtual: true });
jest.mock('./icons/documents.svg', () => 'documents.svg', { virtual: true });
jest.mock('./icons/documents_dark.svg', () => 'documents_dark.svg', { virtual: true });
jest.mock('./icons/globe.svg', () => 'globe.svg', { virtual: true });
jest.mock('./icons/globe_dark.svg', () => 'globe_dark.svg', { virtual: true });
jest.mock('./icons/grpc.svg', () => 'grpc.svg', { virtual: true });
jest.mock('./icons/grpc_dark.svg', () => 'grpc_dark.svg', { virtual: true });
jest.mock('./icons/handlebars.svg', () => 'handlebars.svg', { virtual: true });
jest.mock('./icons/handlebars_dark.svg', () => 'handlebars_dark.svg', { virtual: true });
jest.mock('./icons/kafka.svg', () => 'kafka.svg', { virtual: true });
jest.mock('./icons/kafka_dark.svg', () => 'kafka_dark.svg', { virtual: true });
jest.mock('./icons/postgresql.svg', () => 'postgresql.svg', { virtual: true });
jest.mock('./icons/websocket.svg', () => 'websocket.svg', { virtual: true });
jest.mock('./icons/websocket_dark.svg', () => 'websocket_dark.svg', { virtual: true });

import { getSpanIcon } from './get_span_icon';
import cassandraIcon from './icons/cassandra.svg';
import darkCassandraIcon from './icons/cassandra_dark.svg';
import databaseIcon from './icons/database.svg';
import darkDatabaseIcon from './icons/database_dark.svg';
import defaultIcon from './icons/default.svg';
import documentsIcon from './icons/documents.svg';
import darkDocumentsIcon from './icons/documents_dark.svg';
import globeIcon from './icons/globe.svg';
import darkGlobeIcon from './icons/globe_dark.svg';
import grpcIcon from './icons/grpc.svg';
import darkGrpcIcon from './icons/grpc_dark.svg';
import handlebarsIcon from './icons/handlebars.svg';
import darkHandlebarsIcon from './icons/handlebars_dark.svg';
import kafkaIcon from './icons/kafka.svg';
import darkKafkaIcon from './icons/kafka_dark.svg';
import postgresqlIcon from './icons/postgresql.svg';
import websocketIcon from './icons/websocket.svg';
import darkWebsocketIcon from './icons/websocket_dark.svg';

describe('getSpanIcon', () => {
  it('uses a distinct icon for each asserted light and dark variant', () => {
    expect(new Set([cassandraIcon, darkCassandraIcon, databaseIcon, darkDatabaseIcon]).size).toBe(
      4
    );
  });

  describe('light mode', () => {
    it('returns the default icon when no type is provided', () => {
      expect(getSpanIcon()).toBe(defaultIcon);
      expect(getSpanIcon(undefined, 'postgresql')).toBe(defaultIcon);
    });

    it('returns the default icon for an unknown type', () => {
      expect(getSpanIcon('unknown-type')).toBe(defaultIcon);
    });

    it.each([
      ['db', 'cassandra', cassandraIcon],
      ['db', 'postgresql', postgresqlIcon],
      ['external', 'grpc', grpcIcon],
      ['external', 'websocket', websocketIcon],
      ['messaging', 'kafka', kafkaIcon],
      ['template', 'handlebars', handlebarsIcon],
    ])('returns the light icon for %s/%s', (type, subtype, expected) => {
      expect(getSpanIcon(type, subtype)).toBe(expected);
    });

    it.each([
      ['db', databaseIcon],
      ['cache', databaseIcon],
      ['ext', globeIcon],
      ['external', globeIcon],
      ['messaging', documentsIcon],
      ['resource', globeIcon],
    ])('returns the light type default icon for %s without a known subtype', (type, expected) => {
      expect(getSpanIcon(type)).toBe(expected);
      expect(getSpanIcon(type, 'unknown-subtype')).toBe(expected);
    });

    it('defaults to light mode when isDarkMode is not provided', () => {
      expect(getSpanIcon('db', 'cassandra')).toBe(getSpanIcon('db', 'cassandra', false));
    });
  });

  describe('dark mode', () => {
    it('returns the default icon when no type is provided', () => {
      expect(getSpanIcon(undefined, undefined, true)).toBe(defaultIcon);
      expect(getSpanIcon(undefined, 'postgresql', true)).toBe(defaultIcon);
    });

    it('returns the default icon for an unknown type', () => {
      expect(getSpanIcon('unknown-type', undefined, true)).toBe(defaultIcon);
    });

    it.each([
      ['db', 'cassandra', darkCassandraIcon],
      ['external', 'grpc', darkGrpcIcon],
      ['external', 'websocket', darkWebsocketIcon],
      ['messaging', 'kafka', darkKafkaIcon],
      ['template', 'handlebars', darkHandlebarsIcon],
    ])('returns the dark icon for %s/%s', (type, subtype, expected) => {
      expect(getSpanIcon(type, subtype, true)).toBe(expected);
    });

    it.each([
      ['db', darkDatabaseIcon],
      ['cache', darkDatabaseIcon],
      ['ext', darkGlobeIcon],
      ['external', darkGlobeIcon],
      ['messaging', darkDocumentsIcon],
      ['resource', darkGlobeIcon],
    ])('returns the dark type default icon for %s without a known subtype', (type, expected) => {
      expect(getSpanIcon(type, undefined, true)).toBe(expected);
      expect(getSpanIcon(type, 'unknown-subtype', true)).toBe(expected);
    });

    it('falls back to the light icon for subtypes without a dark variant', () => {
      expect(getSpanIcon('db', 'postgresql', true)).toBe(postgresqlIcon);
    });
  });
});
