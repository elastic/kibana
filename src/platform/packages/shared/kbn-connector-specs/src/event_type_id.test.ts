/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildEventId,
  connectorTypeToEventNamespace,
  normalizeConnectorTypeId,
} from './event_type_id';

describe('event_type_id', () => {
  describe('connectorTypeToEventNamespace', () => {
    it('strips a leading dot', () => {
      expect(connectorTypeToEventNamespace('.myConnector')).toBe('myConnector');
    });

    it('leaves ids without a leading dot unchanged', () => {
      expect(connectorTypeToEventNamespace('myConnector')).toBe('myConnector');
    });
  });

  describe('normalizeConnectorTypeId', () => {
    it('adds a leading dot when missing', () => {
      expect(normalizeConnectorTypeId('myConnector')).toBe('.myConnector');
    });

    it('keeps an existing leading dot', () => {
      expect(normalizeConnectorTypeId('.myConnector')).toBe('.myConnector');
    });
  });

  describe('buildEventId', () => {
    it('builds {namespace}.{eventKey}', () => {
      expect(buildEventId('.myConnector', 'received')).toBe('myConnector.received');
    });
  });
});
