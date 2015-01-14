define(function () {
  return function addWordBreaks(text, minLineLength, separator) {
    var lineSize = 0;
    var newText = '';
    var inHtmlTag = false;
    separator = separator || '<wbr>';

    for (var i = 0, len = text.length; i < len; i++) {
      var chr = text.charAt(i);
      newText += chr;

      switch (chr) {
      case ' ':
      case ';':
      case ':':
      case ',':
        // natural line break, reset line size
        lineSize = 0;
        break;
      case '<':
        inHtmlTag = true;
        break;
      case '>':
        inHtmlTag = false;
        lineSize = 0;
        break;
      default:
        if (!inHtmlTag) lineSize++;
        break;
      }

      if (lineSize > minLineLength) {
        // continuous text is longer then we want,
        // so break it up with a <wbr>
        lineSize = 0;
        newText += separator;
      }
    }

    return newText;
  };
});