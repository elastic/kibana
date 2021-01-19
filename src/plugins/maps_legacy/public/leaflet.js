/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

if (!window.hasOwnProperty('L')) {
  require('leaflet/dist/leaflet.css');
  window.L = require('leaflet/dist/leaflet.js');
  window.L.Browser.touch = false;
  window.L.Browser.pointer = false;

  require('leaflet-vega');
  require('leaflet.heat/dist/leaflet-heat.js');
  require('leaflet-draw/dist/leaflet.draw.css');
  require('leaflet-draw/dist/leaflet.draw.js');
  require('leaflet-responsive-popup/leaflet.responsive.popup.css');
  require('leaflet-responsive-popup/leaflet.responsive.popup.js');
}

export const L = window.L;
