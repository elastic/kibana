/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function detectCURLinLine(line: string) {
  // returns true if text matches a curl request
  return line.match(/^\s*?curl\s+(-X[A-Z]+)?\s*['"]?.*?['"]?(\s*$|\s+?-d\s*?['"])/);
}

export function detectCURL(text: string) {
  // returns true if text matches a curl request
  if (!text) return false;
  for (const line of text.split('\n')) {
    if (detectCURLinLine(line)) {
      return true;
    }
  }
  return false;
}

export function parseCURL(text: string) {
  let state = 'NONE';
  const out = [];
  let body: any[] = [];
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
    line = lines.shift()!.replace(/[\r\n]+/g, '\n') + '\n';
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
  function consumeMatching(pattern: string | RegExp) {
    const result = line.match(pattern);
    if (result) {
      body.push(result[1]);
      line = line.substr(result[0].length);
      detectQuote();
    } else {
      body.push(line);
      line = '';
    }
  }

  function parseCurlLine() {
    let verb = 'GET';
    let request = '';
    let result;
    if ((result = line.match(CurlVerb))) {
      verb = result[1];
    }

    // JS regexen don't support possessive quantifiers, so
    // we need two distinct patterns
    const pattern = HasProtocol.test(line) ? CurlRequestWithProto : CurlRequestWithoutProto;

    if ((result = line.match(pattern))) {
      request = result[1];
    }

    out.push(verb + ' /' + request + '\n');

    if ((result = line.match(CurlData))) {
      line = line.substr(result[0].length);
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

    // Nothing else matches, so output with a prefix of ### for debugging purposes
    else {
      out.push('### ' + line);
      line = '';
    }
  }

  addBodyToOut();
  return out.join('').trim();
}
