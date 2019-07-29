"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ast = require("./ast");

Object.keys(_ast).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _ast[key];
    }
  });
});