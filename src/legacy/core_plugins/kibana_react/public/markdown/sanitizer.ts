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

/* @notice
 * This product includes code that is based on svbergerem/markdown-it-sanitizer,
 * which was available under a "MIT" license.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Steffen van Bergerem
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import MarkdownIt from 'markdown-it';
import StateCore from 'markdown-it/lib/rules_core/state_core';

/**
 * Return a sanitizer plugin for MarkdownIt.
 *
 * @param {MarkdownIt} md - The MarkdownIt instance.
 * @param {boolean} [removeUnknown=false] - Whether to remove unknown HTML tags. If set to `false`,
 * this will simply HTML-encode the tag; if set to `true`, this will strip the tag.
 */
export const sanitizerPlugin = (md: MarkdownIt, removeUnknown: boolean = false) => {
  const escapeHtml = md.utils.escapeHtml;

  let j;

  // in addition to this list, "br" and "hr" are allowed
  const allowedTags = [
    'b',
    'blockquote',
    'code',
    'details',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'sub',
    'summary',
    'sup',
    'strong',
    'ul',
  ];
  const openTagCount = new Array(allowedTags.length);
  for (j = 0; j < allowedTags.length; j++) {
    openTagCount[j] = 0;
  }

  function replaceUnknownTags(str: string) {
    /*
     * it starts with '<' and maybe ends with '>',
     * maybe has a '<' on the right
     * it doesnt have '<' or '>' in between
     * -> it's a tag!
     */
    str = str.replace(/<[^<>]*>?/gi, function(tag: string) {
      let match;
      let tagnameIndex;

      // '<->', '<- ' and '<3 ' look nice, they are harmless
      if (/(^<->|^<-\s|^<3\s)/.test(tag)) {
        return tag;
      }

      // standalone tags
      match = tag.match(/<(br|hr)\s?\/?>/i);
      if (match) {
        return '<' + match[1].toLowerCase() + '>';
      }

      // whitelisted tags
      match = tag.match(
        /<(\/?)(b|blockquote|code|em|h[1-6]|li|ol(?: start="\d+")?|p|pre|s|sub|sup|strong|ul|details|summary)>/i
      );
      if (match && !/<\/ol start="\d+"/i.test(tag)) {
        tagnameIndex = allowedTags.indexOf(match[2].toLowerCase().split(' ')[0]);
        if (match[1] === '/') {
          openTagCount[tagnameIndex] -= 1;
        } else {
          openTagCount[tagnameIndex] += 1;
        }
        if (openTagCount[tagnameIndex] < 0) {
          openTagCount[tagnameIndex] = 0;
          return unknown(tag);
        }
        return '<' + match[1] + match[2].toLowerCase() + '>';
      }

      // other tags we don't recognize
      return unknown(tag);
    });

    return str;
  }

  function unknown(tag: string) {
    if (removeUnknown === true) {
      return '';
    }
    return escapeHtml(tag);
  }

  function sanitizeInlineAndBlock(state: StateCore) {
    let i;
    let blkIdx;
    let inlineTokens;
    // reset counts
    for (j = 0; j < allowedTags.length; j++) {
      openTagCount[j] = 0;
    }

    for (blkIdx = 0; blkIdx < state.tokens.length; blkIdx++) {
      if (state.tokens[blkIdx].type === 'html_block') {
        state.tokens[blkIdx].content = replaceUnknownTags(state.tokens[blkIdx].content);
      }
      if (state.tokens[blkIdx].type !== 'inline') {
        continue;
      }

      inlineTokens = state.tokens[blkIdx].children;
      for (i = 0; i < inlineTokens.length; i++) {
        if (inlineTokens[i].type === 'html_inline') {
          inlineTokens[i].content = replaceUnknownTags(inlineTokens[i].content);
        }
      }
    }
  }

  md.core.ruler.after('linkify', 'sanitize_inline', sanitizeInlineAndBlock);
};
