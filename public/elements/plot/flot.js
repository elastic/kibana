import $ from 'jquery/src/jquery';
if (window) window.jQuery = $;
require('flot-charts/jquery.flot');
require('flot-charts/jquery.flot.time');
require('flot-charts/jquery.flot.pie');
require('flot-charts/jquery.flot.stack');
module.exports = $;
