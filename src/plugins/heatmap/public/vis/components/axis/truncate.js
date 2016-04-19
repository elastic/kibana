var d3 = require('d3');

function truncate() {
  var maxCharLength = 10;

  function component(text) {
    text.each(function () {
      var txt = d3.select(this);
      var labelCharLength = txt.text().length;

      // Shorten label and append ..
      if (labelCharLength > maxCharLength) {
        var truncatedLabel = txt.text().slice(0, maxCharLength) + '..';
        txt.text(truncatedLabel);
      }
    });
  }

  // Public API
  component.maxCharLength = function (_) {
    if (!arguments.length) return maxCharLength;
    maxCharLength = typeof _ === 'number' ? _ : maxCharLength;
    return component;
  };

  return component;
};

module.exports = truncate;
