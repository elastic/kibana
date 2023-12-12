/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
const startMock = coreMock.createStart();

import { mount } from 'enzyme';
import { PainlessError } from './painless_error';
import { findTestSubject } from '@elastic/eui/lib/test';

const searchPhaseException = {
  error: {
    root_cause: [
      {
        type: 'script_exception',
        reason: 'compile error',
        script_stack: ['invalid', '^---- HERE'],
        script: 'invalid',
        lang: 'painless',
        position: {
          offset: 0,
          start: 0,
          end: 7,
        },
      },
    ],
    type: 'search_phase_execution_exception',
    reason: 'all shards failed',
    phase: 'query',
    grouped: true,
    failed_shards: [
      {
        shard: 0,
        index: '.kibana_11',
        node: 'b3HX8C96Q7q1zgfVLxEsPA',
        reason: {
          type: 'script_exception',
          reason: 'compile error',
          script_stack: ['invalid', '^---- HERE'],
          script: 'invalid',
          lang: 'painless',
          position: {
            offset: 0,
            start: 0,
            end: 7,
          },
          caused_by: {
            type: 'illegal_argument_exception',
            reason: 'cannot resolve symbol [invalid]',
          },
        },
      },
    ],
  },
  status: 400,
};

describe('PainlessError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should show reason and code', () => {
    const e = new PainlessError(
      {
        statusCode: 400,
        message: 'search_phase_execution_exception',
        attributes: {
          error: searchPhaseException.error,
        },
      },
      () => {}
    );
    const component = mount(e.getErrorMessage());

    const failedShards = searchPhaseException.error.failed_shards![0];

    const stackTraceElem = findTestSubject(component, 'painlessStackTrace').getDOMNode();
    const stackTrace = failedShards!.reason.script_stack!.splice(-2).join('\n');
    expect(stackTraceElem.textContent).toBe(stackTrace);

    const humanReadableError = findTestSubject(
      component,
      'painlessHumanReadableError'
    ).getDOMNode();
    expect(humanReadableError.textContent).toBe(failedShards?.reason.caused_by?.reason);

    const actions = e.getActions(startMock.application);
    expect(actions.length).toBe(2);
  });
});
