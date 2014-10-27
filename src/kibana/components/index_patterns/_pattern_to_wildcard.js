define(function (require) {
  return function PatternToWildcardFn() {
    return function (format) {
      var wildcard = '';
      var inEscape = false;
      var inPattern = false;

      for (var i = 0; i < format.length; i++) {
        var ch = format.charAt(i);
        switch (ch) {
        case '[':
          inPattern = false;
          if (!inEscape) {
            inEscape = true;
          } else {
            wildcard += ch;
          }
          break;
        case ']':
          if (inEscape) {
            inEscape = false;
          } else if (!inPattern) {
            wildcard += ch;
          }
          break;
        default:
          if (inEscape) {
            wildcard += ch;
          } else if (!inPattern) {
            wildcard += '*';
            inPattern = true;
          }
        }
      }

      return wildcard;
    };
  };
});