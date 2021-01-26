/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function extractAsciidocInfo(text: string): { firstParagraph?: string; anchor?: string } {
  // First group is to grab the anchor - \[\[(.*)\]\]
  // Tecond group, (== ), removes the equals from the header
  // Third group could perhaps be done better, but is essentially:
  // If there is a sub heading after the intro, match the intro and stop - (([\s\S]*?)(?=\=\=\=|\[\[)))
  // If there is not a sub heading after the intro, match the intro - ([\s\S]*)
  const matchAnchorAndIntro = /\[\[(.*)\]\]\n(== .*)\n(((([\s\S]*?)(?=\=\=\=|\[)))|([\s\S]*))/gm;

  const matches = matchAnchorAndIntro.exec(text);
  const firstParagraph = matches && matches.length >= 4 ? matches[3].toString().trim() : undefined;
  const anchor = matches && matches.length >= 2 ? matches[1].toString().trim() : undefined;
  return { firstParagraph, anchor };
}
