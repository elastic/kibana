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

import MarkdownIt from 'markdown-it';
import dedent from 'dedent';

import { getNoteFromDescription } from './get_note_from_description';

it('extracts expected components from html', () => {
  const mk = new MarkdownIt();

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        My PR description

        Fixes: #1234

        ## Release Note:

        Checkout this feature
      `)
    )
  ).toMatchInlineSnapshot(`"Checkout this feature"`);

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        My PR description

        Fixes: #1234

        #### Release Note:

        We fixed an issue
      `)
    )
  ).toMatchInlineSnapshot(`"We fixed an issue"`);

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        My PR description

        Fixes: #1234

        Release note: Checkout feature foo
      `)
    )
  ).toMatchInlineSnapshot(`"Checkout feature foo"`);

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        # Summary

        My PR description

           release note : bar
      `)
    )
  ).toMatchInlineSnapshot(`"bar"`);
});
