"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "dependenciesParseStrategy", {
  enumerable: true,
  get: function () {
    return _strategies.dependenciesParseStrategy;
  }
});
Object.defineProperty(exports, "dependenciesVisitorsGenerator", {
  enumerable: true,
  get: function () {
    return _visitors.dependenciesVisitorsGenerator;
  }
});
Object.defineProperty(exports, "parseSingleFile", {
  enumerable: true,
  get: function () {
    return _code_parser.parseSingleFile;
  }
});
Object.defineProperty(exports, "parseSingleFileSync", {
  enumerable: true,
  get: function () {
    return _code_parser.parseSingleFileSync;
  }
});
Object.defineProperty(exports, "parseEntries", {
  enumerable: true,
  get: function () {
    return _code_parser.parseEntries;
  }
});

var _strategies = require("./strategies");

var _visitors = require("./visitors");

var _code_parser = require("./code_parser");