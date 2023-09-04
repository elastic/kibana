/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { DocViewerError } from './doc_viewer_error';

test('DocViewerError should wrap error in boundary', () => {
  const props = {
    error: new Error('my error'),
  };

  expect(() => {
    const wrapper = mount(<DocViewerError {...props} />);
    const html = wrapper.html();
    expect(html).toContain('euiErrorBoundary');
    expect(html).toContain('my error');
  }).not.toThrowError();
});
