/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
