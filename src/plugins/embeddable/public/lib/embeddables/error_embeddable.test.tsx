/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { setStubKibanaServices as setPresentationPanelMocks } from '@kbn/presentation-panel-plugin/public/mocks';
import { waitFor, render } from '@testing-library/react';
import { ErrorEmbeddable } from './error_embeddable';
import { EmbeddableRoot } from './embeddable_root';

test('ErrorEmbeddable renders an embeddable', async () => {
  setPresentationPanelMocks();
  const embeddable = new ErrorEmbeddable('some error occurred', { id: '123', title: 'Error' });
  const { getByTestId, getByText } = render(<EmbeddableRoot embeddable={embeddable} />);

  expect(getByTestId('embeddableStackError')).toBeVisible();
  await waitFor(() => getByTestId('errorMessageMarkdown')); // wait for lazy markdown component
  expect(getByText(/some error occurred/i)).toBeVisible();
});

test('ErrorEmbeddable renders an embeddable with markdown message', async () => {
  setPresentationPanelMocks();
  const error = '[some link](http://localhost:5601/takeMeThere)';
  const embeddable = new ErrorEmbeddable(error, { id: '123', title: 'Error' });
  const { getByTestId, getByText } = render(<EmbeddableRoot embeddable={embeddable} />);

  expect(getByTestId('embeddableStackError')).toBeVisible();
  await waitFor(() => getByTestId('errorMessageMarkdown')); // wait for lazy markdown component
  expect(getByText(/some link/i)).toMatchInlineSnapshot(`
    <a
      class="euiLink emotion-euiLink-primary"
      href="http://localhost:5601/takeMeThere"
      rel="noopener noreferrer"
      target="_blank"
    >
      some link
      <span
        class="emotion-EuiExternalLinkIcon"
        data-euiicon-type="popout"
        role="presentation"
      />
      <span
        class="emotion-euiScreenReaderOnly"
      >
        (external, opens in a new tab or window)
      </span>
    </a>
  `);
});
