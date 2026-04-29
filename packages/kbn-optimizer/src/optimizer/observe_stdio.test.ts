/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';

import { allValuesFrom } from '../common';

import { observeStdio$ } from './observe_stdio';

it('notifies on every line, uncluding partial content at the end without a newline', async () => {
  const chunks = [`foo\nba`, `r\nb`, `az`];

  await expect(
    allValuesFrom(
      observeStdio$(
        new Readable({
          read() {
            this.push(chunks.shift()!);
            if (!chunks.length) {
              this.push(null);
            }
          },
        })
      )
    )
  ).resolves.toMatchInlineSnapshot(`
          Array [
            "foo",
            "bar",
            "baz",
          ]
        `);
});
