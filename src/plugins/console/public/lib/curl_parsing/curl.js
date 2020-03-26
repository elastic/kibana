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

function detectCURLinLine(line) {
  // returns true if text matches a curl request
  return line.match(/^\s*?curl\s+(-X[A-Z]+)?\s*['"]?.*?['"]?(\s*$|\s+?-d\s*?['"])/);
}

export function detectCURL(text) {
  // returns true if text matches a curl request
  if (!text) return false;
  for (const line of text.split('\n')) {
    if (detectCURLinLine(line)) {
      return true;
    }
  }
  return false;
}

export function parseCURL(text) {
  let state = 'NONE';
  const out = [];
  let body = [];
  let line = '';
  const lines = text.trim().split('\n');
  let matches;

  const EmptyLine = /^\s*$/;
  const Comment = /^\s*(?:#|\/{2,})(.*)\n?$/;
  const ExecutionComment = /^\s*#!/;
  const ClosingSingleQuote = /^([^']*)'/;
  const ClosingDoubleQuote = /^((?:[^\\"]|\\.)*)"/;
  const EscapedQuotes = /^((?:[^\\"']|\\.)+)/;

  const LooksLikeCurl = /^\s*curl\s+/;
  const CurlVerb = /-X ?(GET|HEAD|POST|PUT|DELETE)/;

  const HasProtocol = /[\s"']https?:\/\//;
  const CurlRequestWithProto = /[\s"']https?:\/\/[^\/ ]+\/+([^\s"']+)/;
  const CurlRequestWithoutProto = /[\s"'][^\/ ]+\/+([^\s"']+)/;
  const CurlData = /^.+\s(--data|-d)\s*/;
  const SenseLine = /^\s*(GET|HEAD|POST|PUT|DELETE)\s+\/?(.+)/;

  if (lines.length > 0 && ExecutionComment.test(lines[0])) {
    lines.shift();
  }

  function nextLine() {
    if (line.length > 0) {
      return true;
    }
    if (lines.length === 0) {
      return false;
    }
    line = lines.shift().replace(/[\r\n]+/g, '\n') + '\n';
    return true;
  }

  function unescapeLastBodyEl() {
    const str = body.pop().replace(/\\([\\"'])/g, '$1');
    body.push(str);
  }

  // Is the next char a single or double quote?
  // If so remove it
  function detectQuote() {
    if (line.substr(0, 1) === "'") {
      line = line.substr(1);
      state = 'SINGLE_QUOTE';
    } else if (line.substr(0, 1) === '"') {
      line = line.substr(1);
      state = 'DOUBLE_QUOTE';
    } else {
      state = 'UNQUOTED';
    }
  }

  // Body is finished - append to output with final LF
  function addBodyToOut() {
    if (body.length > 0) {
      out.push(body.join(''));
      body = [];
    }
    state = 'LF';
    out.push('\n');
  }

  // If the pattern matches, then the state is about to change,
  // so add the capture to the body and detect the next state
  // Otherwise add the whole line
  function consumeMatching(pattern) {
    const matches = line.match(pattern);
    if (matches) {
      body.push(matches[1]);
      line = line.substr(matches[0].length);
      detectQuote();
    } else {
      body.push(line);
      line = '';
    }
  }

  function parseCurlLine() {
    let verb = 'GET';
    let request = '';
    let matches;
    if ((matches = line.match(CurlVerb))) {
      verb = matches[1];
    }

    // JS regexen don't support possessive quantifiers, so
    // we need two distinct patterns
    const pattern = HasProtocol.test(line) ? CurlRequestWithProto : CurlRequestWithoutProto;

    if ((matches = line.match(pattern))) {
      request = matches[1];
    }

    out.push(verb + ' /' + request + '\n');

    if ((matches = line.match(CurlData))) {
      line = line.substr(matches[0].length);
      detectQuote();
      if (EmptyLine.test(line)) {
        line = '';
      }
    } else {
      state = 'NONE';
      line = '';
      out.push('');
    }
  }

  while (nextLine()) {
    if (state === 'SINGLE_QUOTE') {
      consumeMatching(ClosingSingleQuote);
    } else if (state === 'DOUBLE_QUOTE') {
      consumeMatching(ClosingDoubleQuote);
      unescapeLastBodyEl();
    } else if (state === 'UNQUOTED') {
      consumeMatching(EscapedQuotes);
      if (body.length) {
        unescapeLastBodyEl();
      }
      if (state === 'UNQUOTED') {
        addBodyToOut();
        line = '';
      }
    }

    // the BODY state (used to match the body of a Sense request)
    // can be terminated early if it encounters
    // a comment or an empty line
    else if (state === 'BODY') {
      if (Comment.test(line) || EmptyLine.test(line)) {
        addBodyToOut();
      } else {
        body.push(line);
        line = '';
      }
    } else if (EmptyLine.test(line)) {
      if (state !== 'LF') {
        out.push('\n');
        state = 'LF';
      }
      line = '';
    } else if ((matches = line.match(Comment))) {
      out.push('#' + matches[1] + '\n');
      state = 'NONE';
      line = '';
    } else if (LooksLikeCurl.test(line)) {
      parseCurlLine();
    } else if ((matches = line.match(SenseLine))) {
      out.push(matches[1] + ' /' + matches[2] + '\n');
      line = '';
      state = 'BODY';
    }

    // Nothing else matches, so output with a prefix of !!! for debugging purposes
    else {
      out.push('### ' + line);
      line = '';
    }
  }

  addBodyToOut();
  return out.join('').trim();
}
