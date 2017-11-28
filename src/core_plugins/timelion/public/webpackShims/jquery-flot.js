const $ = require('jquery');

if (window) window.jQuery = $;

// load flot
require('jquery.flot');

// load flot plugins
require('jquery.flot.time');
require('jquery.flot.symbol');
require('jquery.flot.crosshair');
require('jquery.flot.selection');
require('jquery.flot.stack');
require('jquery.flot.axislabels');

module.exports = $;
