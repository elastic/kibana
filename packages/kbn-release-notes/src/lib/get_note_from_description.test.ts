/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      `),
      'release note'
    )
  ).toMatchInlineSnapshot(`"Checkout this feature"`);

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        My PR description

        Fixes: #1234

        #### Dev docs:

        We fixed an issue
      `),
      'dev docs'
    )
  ).toMatchInlineSnapshot(`"We fixed an issue"`);

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        My PR description

        Fixes: #1234

        OTHER TITLE: Checkout feature foo
      `),
      'other title'
    )
  ).toMatchInlineSnapshot(`"Checkout feature foo"`);

  expect(
    getNoteFromDescription(
      mk.render(dedent`
        # Summary

        My PR description

           release note : bar
      `),
      'release note'
    )
  ).toMatchInlineSnapshot(`"bar"`);
});
