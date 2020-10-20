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
