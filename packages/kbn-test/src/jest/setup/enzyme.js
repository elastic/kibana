/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

configure({ adapter: new Adapter() });

/* eslint-env jest */

/**
 * This is a workaround to fix snapshot serialization of emotion when rendering React@18 using `import { render } from 'enzyme'`
 */
let mockInsideEnzymeRender = false;
jest.mock('@emotion/use-insertion-effect-with-fallbacks', () => {
  const actual = jest.requireActual('@emotion/use-insertion-effect-with-fallbacks');
  return {
    ...actual,
    useInsertionEffectAlwaysWithSyncFallback: (cb) => {
      // if we are inside enzyme render, then force the sync fallback
      return mockInsideEnzymeRender ? cb() : actual.useInsertionEffectAlwaysWithSyncFallback(cb);
    },
  };
});

jest.mock('enzyme', () => {
  const actual = jest.requireActual('enzyme');
  return {
    ...actual,
    render: (node, options) => {
      try {
        mockInsideEnzymeRender = true;
        return actual.render(node, options);
      } finally {
        mockInsideEnzymeRender = false;
      }
    },
  };
});
