"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _components = require("../src/components");

Object.keys(_components).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _components[key];
    }
  });
});
