/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractAsciidocInfo } from './extract_asciidoc_info';

it('Returns the info and anchor when there is only one paragraph', () => {
  const { firstParagraph, anchor } = extractAsciidocInfo(
    `[[this-is-the-anchor]]
== I'm the heading!

Hello

I'm an intro paragraph!`
  );

  expect(firstParagraph).toEqual(`Hello\n\nI'm an intro paragraph!`);
  expect(anchor).toEqual('this-is-the-anchor');
});

it('Returns the info and anchor when there are multiple paragraphs without an anchor', () => {
  const { firstParagraph, anchor } = extractAsciidocInfo(
    `[[this-is-the-anchor]]
== Heading here

Intro.

=== Another heading

More details`
  );

  expect(firstParagraph).toEqual(`Intro.`);
  expect(anchor).toEqual('this-is-the-anchor');
});

it('Returns the info and anchor when there are multiple paragraphs with anchors', () => {
  const { firstParagraph, anchor } = extractAsciidocInfo(
    `[[this-is-the-anchor]]
== Heading here

Intro.

[[an-anchor]]
=== Another heading

More details
 `
  );

  expect(firstParagraph).toEqual(`Intro.`);
  expect(anchor).toEqual('this-is-the-anchor');
});

it('Returns the info and anchor when there are multiple paragraphs with discrete prefixes', () => {
  const { firstParagraph, anchor } = extractAsciidocInfo(
    `[[this-is-the-anchor]]
== Heading here

Intro.

[discrete]
=== Another heading

More details
 `
  );

  expect(firstParagraph).toEqual(`Intro.`);
  expect(anchor).toEqual('this-is-the-anchor');
});
