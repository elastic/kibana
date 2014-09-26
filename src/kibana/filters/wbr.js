/* This hideous thing inserts hiliarous zero width spaces to force word wrapping in
 * a dynamically sized table. The del tags are so that the browser doesn't try to copy
 * the zero width space. LOL. num is the number of characters to break at.
 */
define(function (require) {
  require('modules')
    .get('kibana')
    .filter('wbr', function () {
      return function (str) {
        if (typeof str !== 'string') {
          return str;
        }
        if (str.length < 100) {
          return str;
        }
        return str.replace(
          RegExp('(\\w{' + 10 + '}|[:;,])(\\w)', 'g'),
          function (all, text, char, trailer) {
            return text + '<del><wbr></del>' + char;
          }
        );
      };
    });
});