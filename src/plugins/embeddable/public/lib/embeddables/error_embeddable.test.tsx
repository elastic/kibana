/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { waitFor, render } from '@testing-library/react';
import { ErrorEmbeddable } from './error_embeddable';
import { EmbeddableRoot } from './embeddable_root';

test('ErrorEmbeddable renders an embeddable', async () => {
  const embeddable = new ErrorEmbeddable('some error occurred', { id: '123', title: 'Error' });
  const { getByTestId, getByText } = render(<EmbeddableRoot embeddable={embeddable} />);

  expect(getByTestId('embeddableStackError')).toBeVisible();
  await waitFor(() => getByTestId('errorMessageMarkdown')); // wait for lazy markdown component
  expect(getByText(/some error occurred/i)).toBeVisible();
});

test('ErrorEmbeddable renders an embeddable with markdown message', async () => {
  const error = '[some link](http://localhost:5601/takeMeThere)';
  const embeddable = new ErrorEmbeddable(error, { id: '123', title: 'Error' });
  const { getByTestId, getByText } = render(<EmbeddableRoot embeddable={embeddable} />);

  expect(getByTestId('embeddableStackError')).toBeVisible();
  await waitFor(() => getByTestId('errorMessageMarkdown')); // wait for lazy markdown component
  expect(getByText(/some link/i)).toMatchInlineSnapshot(`
    <a
      href="http://localhost:5601/takeMeThere"
      rel="noopener noreferrer"
      target="_blank"
    >
      some link
    </a>
  `);
});
