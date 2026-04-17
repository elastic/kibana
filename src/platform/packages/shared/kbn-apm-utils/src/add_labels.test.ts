/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { trace } from '@opentelemetry/api';
import type { AttributeValue } from '@opentelemetry/api';
import apm from 'elastic-apm-node';

import { addSpanLabels, addTransactionLabels } from './add_labels';
import type { Labels } from './add_labels';

jest.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    addLabels: jest.fn(),
    currentTransaction: {
      addLabels: jest.fn(),
    },
  },
}));

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: jest.fn(),
  },
}));

interface MockSpan {
  setAttributes: jest.Mock<void, [Record<string, AttributeValue>]>;
}

interface MockApm {
  addLabels: jest.Mock<void, [Labels, boolean?]>;
  currentTransaction?: {
    addLabels: jest.Mock<void, [Labels, boolean?]>;
  };
}

const mockedApm = apm as unknown as MockApm;
const getActiveSpanMock = trace.getActiveSpan as jest.MockedFunction<typeof trace.getActiveSpan>;

const createMockSpan = (): MockSpan => ({
  setAttributes: jest.fn(),
});

const getTransactionAddLabelsMock = (): jest.Mock<void, [Labels, boolean?]> => {
  if (!mockedApm.currentTransaction) {
    throw new Error('expected currentTransaction mock to be defined');
  }

  return mockedApm.currentTransaction.addLabels;
};

describe('add_labels', () => {
  beforeEach(() => {
    mockedApm.addLabels.mockClear();
    getTransactionAddLabelsMock().mockClear();
    getActiveSpanMock.mockReset();
  });

  describe('addSpanLabels', () => {
    it('calls apm.addLabels with original labels', () => {
      const labels: Labels = {
        foo: 'bar',
        count: 3,
      };
      const span = createMockSpan();

      getActiveSpanMock.mockReturnValue(span as never);

      addSpanLabels(labels);

      expect(mockedApm.addLabels).toHaveBeenCalledWith(labels, undefined);
    });

    it('calls setAttributes on active OTel span with kibana.-prefixed keys', () => {
      const span = createMockSpan();

      getActiveSpanMock.mockReturnValue(span as never);

      addSpanLabels({
        foo: 'bar',
        count: 3,
        enabled: true,
      });

      expect(span.setAttributes).toHaveBeenCalledWith({
        'kibana.foo': 'bar',
        'kibana.count': 3,
        'kibana.enabled': true,
      });
    });

    it('filters out null and undefined label values before OTel write', () => {
      const span = createMockSpan();

      getActiveSpanMock.mockReturnValue(span as never);

      addSpanLabels({
        kept: 'value',
        nullish: null,
        missing: undefined,
        zero: 0,
        disabled: false,
      });

      expect(span.setAttributes).toHaveBeenCalledWith({
        'kibana.kept': 'value',
        'kibana.zero': 0,
        'kibana.disabled': false,
      });
    });

    it('with otelAttributes uses provided attributes instead of auto-prefixed', () => {
      const span = createMockSpan();
      const otelAttributes = {
        'custom.foo': 'bar',
        'custom.count': 42,
      };

      getActiveSpanMock.mockReturnValue(span as never);

      addSpanLabels(
        {
          foo: 'ignored',
        },
        { otelAttributes }
      );

      expect(span.setAttributes).toHaveBeenCalledWith(otelAttributes);
    });

    it('forwards isString option to apm.addLabels', () => {
      const span = createMockSpan();
      const labels = {
        foo: 123,
      };

      getActiveSpanMock.mockReturnValue(span as never);

      addSpanLabels(labels, { isString: true });

      expect(mockedApm.addLabels).toHaveBeenCalledWith(labels, true);
    });
  });

  describe('addTransactionLabels', () => {
    it('calls apm.currentTransaction.addLabels with original labels', () => {
      const labels: Labels = {
        foo: 'bar',
        count: 3,
      };
      const span = createMockSpan();

      getActiveSpanMock.mockReturnValue(span as never);

      addTransactionLabels(labels);

      expect(getTransactionAddLabelsMock()).toHaveBeenCalledWith(labels, undefined);
    });

    it('calls setAttributes on active OTel span with kibana.-prefixed keys', () => {
      const span = createMockSpan();

      getActiveSpanMock.mockReturnValue(span as never);

      addTransactionLabels({
        foo: 'bar',
        count: 3,
        enabled: true,
      });

      expect(span.setAttributes).toHaveBeenCalledWith({
        'kibana.foo': 'bar',
        'kibana.count': 3,
        'kibana.enabled': true,
      });
    });

    it('forwards isString option to apm.currentTransaction.addLabels', () => {
      const span = createMockSpan();
      const labels = {
        foo: 123,
      };

      getActiveSpanMock.mockReturnValue(span as never);

      addTransactionLabels(labels, { isString: true });

      expect(getTransactionAddLabelsMock()).toHaveBeenCalledWith(labels, true);
    });
  });

  it('no-ops on the OTel side when trace.getActiveSpan() returns undefined', () => {
    const labels = {
      foo: 'bar',
    };

    getActiveSpanMock.mockReturnValue(undefined);

    expect(() => {
      addSpanLabels(labels);
      addTransactionLabels(labels);
    }).not.toThrow();

    expect(mockedApm.addLabels).toHaveBeenCalledWith(labels, undefined);
    expect(getTransactionAddLabelsMock()).toHaveBeenCalledWith(labels, undefined);
  });

  it('handles an empty labels object gracefully', () => {
    const span = createMockSpan();

    getActiveSpanMock.mockReturnValue(span as never);

    expect(() => addSpanLabels({})).not.toThrow();
    expect(() => addTransactionLabels({})).not.toThrow();

    expect(span.setAttributes).toHaveBeenNthCalledWith(1, {});
    expect(span.setAttributes).toHaveBeenNthCalledWith(2, {});
  });
});
