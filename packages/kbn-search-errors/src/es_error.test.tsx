/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { createEsError } from './create_es_error';
import { renderSearchError } from './render_search_error';
import { shallow } from 'enzyme';
import { coreMock } from '@kbn/core/public/mocks';

const services = {
  application: coreMock.createStart().application,
  docLinks: {
    links: {
      fleet: {
        datastreamsTSDSMetrics: '',
      },
    },
  } as CoreStart['docLinks'],
};

describe('EsError', () => {
  const esError = createEsError(
    {
      statusCode: 400,
      message: 'search_phase_execution_exception',
      attributes: {
        error: {
          type: 'x_content_parse_exception',
          reason: '[1:78] [date_histogram] failed to parse field [calendar_interval]',
          caused_by: {
            type: 'illegal_argument_exception',
            reason: 'The supplied interval [2q] could not be parsed as a calendar interval.',
          },
        },
      },
    },
    () => {},
    services
  );

  test('should set error.message to root "error cause" reason', () => {
    expect(esError.message).toEqual(
      'The supplied interval [2q] could not be parsed as a calendar interval.'
    );
  });

  test('should render error message', () => {
    const searchErrorDisplay = renderSearchError(esError);
    expect(searchErrorDisplay).not.toBeUndefined();
    const wrapper = shallow(searchErrorDisplay?.body as ReactElement);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return 1 action', () => {
    const searchErrorDisplay = renderSearchError(esError);
    expect(searchErrorDisplay).not.toBeUndefined();
    expect(searchErrorDisplay?.actions?.length).toBe(1);
  });
});
