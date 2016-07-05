define(function () {
  'use strict';

  function detectCURLinLine(line) {
    // returns true if text matches a curl request
    return line.match(/^\s*?curl\s+(-X[A-Z]+)?\s*['"]?.*?['"]?(\s*$|\s+?-d\s*?['"])/);

  }

  function detectCURL(text) {
    // returns true if text matches a curl request
    if (!text) return false;
    for (var line of text.split("\n")) {
      if (detectCURLinLine(line)) {
        return true;
      }
    }
    return false;
  }

  function parseCURL(text) {
    var state = 'NONE';
    var out = [];
    var body = [];
    var line = '';
    var lines = text.trim().split("\n");
    var matches;

    var EmptyLine = /^\s*$/;
    var Comment = /^\s*(?:#|\/{2,})(.*)\n?$/;
    var ExecutionComment = /^\s*#!/;
    var ClosingSingleQuote = /^([^']*)'/;
    var ClosingDoubleQuote = /^((?:[^\\"]|\\.)*)"/;
    var EscapedQuotes = /^((?:[^\\"']|\\.)+)/;

    var LooksLikeCurl = /^\s*curl\s+/;
    var CurlVerb = /-X ?(GET|HEAD|POST|PUT|DELETE)/;

    var HasProtocol = /[\s"']https?:\/\//;
    var CurlRequestWithProto = /[\s"']https?:\/\/[^\/ ]+\/+([^\s"']+)/;
    var CurlRequestWithoutProto = /[\s"'][^\/ ]+\/+([^\s"']+)/;
    var CurlData = /^.+\s(--data|-d)\s*/;
    var SenseLine = /^\s*(GET|HEAD|POST|PUT|DELETE)\s+\/?(.+)/;

    if (lines.length > 0 && ExecutionComment.test(lines[0])) {
      lines.shift();
    }

    function nextLine() {
      if (line.length > 0) {
        return true;
      }
      if (lines.length == 0) {
        return false;
      }
      line = lines.shift().replace(/[\r\n]+/g, "\n") + "\n";
      return true;
    }

    function unescapeLastBodyEl() {
      var str = body.pop().replace(/\\([\\"'])/g, "$1");
      body.push(str);
    }

    // Is the next char a single or double quote?
    // If so remove it
    function detectQuote() {
      if (line.substr(0, 1) == "'") {
        line = line.substr(1);
        state = 'SINGLE_QUOTE';
      }
      else if (line.substr(0, 1) == '"') {
        line = line.substr(1);
        state = 'DOUBLE_QUOTE';
      }
      else {
        state = 'UNQUOTED';
      }
    }

    // Body is finished - append to output with final LF
    function addBodyToOut() {
      if (body.length > 0) {
        out.push(body.join(""));
        body = [];
      }
      state = 'LF';
      out.push("\n");
    }

    // If the pattern matches, then the state is about to change,
    // so add the capture to the body and detect the next state
    // Otherwise add the whole line
    function consumeMatching(pattern) {
      var matches = line.match(pattern);
      if (matches) {
        body.push(matches[1]);
        line = line.substr(matches[0].length);
        detectQuote();
      }
      else {
        body.push(line);
        line = '';
      }
    }

    function parseCurlLine() {
      var verb = 'GET';
      var request = '';
      var matches;
      if (matches = line.match(CurlVerb)) {
        verb = matches[1];
      }

      // JS regexen don't support possesive quantifiers, so
      // we need two distinct patterns
      var pattern = HasProtocol.test(line)
        ? CurlRequestWithProto
        : CurlRequestWithoutProto;

      if (matches = line.match(pattern)) {
        request = matches[1];
      }

      out.push(verb + ' /' + request + "\n");

      if (matches = line.match(CurlData)) {
        line = line.substr(matches[0].length);
        detectQuote();
        if (EmptyLine.test(line)) {
          line = '';
        }
      }
      else {
        state = 'NONE';
        line = '';
        out.push('');
      }
    }

    while (nextLine()) {

      if (state == 'SINGLE_QUOTE') {
        consumeMatching(ClosingSingleQuote);
      }

      else if (state == 'DOUBLE_QUOTE') {
        consumeMatching(ClosingDoubleQuote);
        unescapeLastBodyEl();
      }

      else if (state == 'UNQUOTED') {
        consumeMatching(EscapedQuotes);
        if (body.length) {
          unescapeLastBodyEl();
        }
        if (state == 'UNQUOTED') {
          addBodyToOut();
          line = ''
        }
      }

      // the BODY state (used to match the body of a Sense request)
      // can be terminated early if it encounters
      // a comment or an empty line
      else if (state == 'BODY') {
        if (Comment.test(line) || EmptyLine.test(line)) {
          addBodyToOut();
        }
        else {
          body.push(line);
          line = '';
        }
      }

      else if (EmptyLine.test(line)) {
        if (state != 'LF') {
          out.push("\n");
          state = 'LF';
        }
        line = '';
      }

      else if (matches = line.match(Comment)) {
        out.push("#" + matches[1] + "\n");
        state = 'NONE';
        line = '';
      }

      else if (LooksLikeCurl.test(line)) {
        parseCurlLine();
      }

      else if (matches = line.match(SenseLine)) {
        out.push(matches[1] + ' /' + matches[2] + "\n");
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


  return {
    parseCURL: parseCURL,
    detectCURL: detectCURL
  };

});
