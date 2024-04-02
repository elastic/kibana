/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { renderToString } from './render_to_string';

describe('renderToString', () => {
  test('returns the static HTML of a very basic JSX Element', () => {
    expect(renderToString(<>This is a test</>)).toEqual('This is a test');
  });

  test('returns the static HTML of a more complex JSX Element', () => {
    const str = renderToString(<EuiButton>This is a button</EuiButton>)
      // normalize the `css-{SOMETHING}-...` strings to avoid emotion getting in the way
      .replace(/css-\w+-eui/g, 'css-BUILD-eui');
    expect(str).toMatchInlineSnapshot(
      `"<button type=\\"button\\" class=\\"euiButton css-BUILD-euiButtonDisplay-m-defaultMinWidth-base-primary\\"><span class=\\"css-BUILD-euiButtonDisplayContent\\"><span class=\\"eui-textTruncate\\">This is a button</span></span></button>"`
    );
  });
});
