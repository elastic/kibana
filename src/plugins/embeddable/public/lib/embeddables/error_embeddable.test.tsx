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
import { ErrorEmbeddable } from './error_embeddable';
import { EmbeddableRoot } from './embeddable_root';
import { mount } from 'enzyme';

test('ErrorEmbeddable renders an embeddable', async () => {
  const embeddable = new ErrorEmbeddable('some error occurred', { id: '123', title: 'Error' });
  const component = mount(<EmbeddableRoot embeddable={embeddable} />);
  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="embeddableStackError"]').length
  ).toBe(1);
  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="errorMessageMarkdown"]').length
  ).toBe(1);
  expect(
    component
      .getDOMNode()
      .querySelectorAll('[data-test-subj="errorMessageMarkdown"]')[0]
      .innerHTML.includes('some error occurred')
  ).toBe(true);
});

test('ErrorEmbeddable renders an embeddable with markdown message', async () => {
  const error = '[some link](http://localhost:5601/takeMeThere)';
  const embeddable = new ErrorEmbeddable(error, { id: '123', title: 'Error' });
  const component = mount(<EmbeddableRoot embeddable={embeddable} />);
  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="embeddableStackError"]').length
  ).toBe(1);
  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="errorMessageMarkdown"]').length
  ).toBe(1);
  expect(
    component
      .getDOMNode()
      .querySelectorAll('[data-test-subj="errorMessageMarkdown"]')[0]
      .innerHTML.includes(
        '<a href="http://localhost:5601/takeMeThere" target="_blank" rel="noopener noreferrer">some link</a>'
      )
  ).toBe(true);
});
