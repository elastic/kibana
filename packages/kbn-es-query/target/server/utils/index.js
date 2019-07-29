"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get_time_zone_from_settings = require("./get_time_zone_from_settings");

Object.keys(_get_time_zone_from_settings).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _get_time_zone_from_settings[key];
    }
  });
});