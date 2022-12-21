/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';

import { FormatEditorSamples } from './samples';

describe('FormatEditorSamples', () => {
  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <FormatEditorSamples
        samples={[
          { input: 'test', output: 'TEST' },
          { input: 123, output: '456' },
          { input: ['foo', 'bar'], output: '<span>foo</span>, <span>bar</span>' },
        ]}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render nothing if there are no samples', async () => {
    const component = shallowWithI18nProvider(<FormatEditorSamples samples={[]} />);

    expect(component).toMatchSnapshot();
  });
});
