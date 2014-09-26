define(function (require) {
  require('modules')
    .get('kibana')
    .filter('xmlEscape', function () {
      return function (text) {
        if (text && typeof text === 'string') {
          return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/'/g, '&#39;')
          .replace(/"/g, '&quot;');
        }
        return text;
      };
    });
});