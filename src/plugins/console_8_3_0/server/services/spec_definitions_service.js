"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpecDefinitionsService = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _lodash = _interopRequireWildcard(require("lodash"));

var _glob = _interopRequireDefault(require("glob"));

var _path = require("path");

var _fs = require("fs");

var _lib = require("../lib");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const PATH_TO_OSS_JSON_SPEC = (0, _path.resolve)(__dirname, '../lib/spec_definitions/json');

class SpecDefinitionsService {
  constructor() {
    (0, _defineProperty2.default)(this, "name", 'es');
    (0, _defineProperty2.default)(this, "globalRules", {});
    (0, _defineProperty2.default)(this, "endpoints", {});
    (0, _defineProperty2.default)(this, "extensionSpecFilePaths", []);
    (0, _defineProperty2.default)(this, "hasLoadedSpec", false);
  }

  addGlobalAutocompleteRules(parentNode, rules) {
    this.globalRules[parentNode] = rules;
  }

  addEndpointDescription(endpoint, description = {}) {
    let copiedDescription = {};

    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint]
      };
    }

    let urlParamsDef;

    _lodash.default.each(description.patterns || [], function (p) {
      if (p.indexOf('{indices}') >= 0) {
        urlParamsDef = urlParamsDef || {};
        urlParamsDef.ignore_unavailable = '__flag__';
        urlParamsDef.allow_no_indices = '__flag__';
        urlParamsDef.expand_wildcards = ['open', 'closed'];
      }
    });

    if (urlParamsDef) {
      description.url_params = _lodash.default.assign(description.url_params || {}, copiedDescription.url_params);

      _lodash.default.defaults(description.url_params, urlParamsDef);
    }

    _lodash.default.assign(copiedDescription, description);

    _lodash.default.defaults(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET']
    });

    this.endpoints[endpoint] = copiedDescription;
  }

  asJson() {
    return {
      name: this.name,
      globals: this.globalRules,
      endpoints: this.endpoints
    };
  }

  addExtensionSpecFilePath(path) {
    this.extensionSpecFilePaths.push(path);
  }

  addProcessorDefinition(processor) {
    if (!this.hasLoadedSpec) {
      throw new Error('Cannot add a processor definition because spec definitions have not loaded!');
    }

    this.endpoints._processor.data_autocomplete_rules.__one_of.push(processor);
  }

  setup() {
    return {
      addExtensionSpecFilePath: this.addExtensionSpecFilePath.bind(this)
    };
  }

  start() {
    if (!this.hasLoadedSpec) {
      this.loadJsonSpec();
      this.loadJSSpec();
      this.hasLoadedSpec = true;
      return {
        addProcessorDefinition: this.addProcessorDefinition.bind(this)
      };
    } else {
      throw new Error('Service has already started!');
    }
  }

  loadJSONSpecInDir(dirname) {
    const generatedFiles = _glob.default.sync((0, _path.join)(dirname, 'generated', '*.json'));

    const overrideFiles = _glob.default.sync((0, _path.join)(dirname, 'overrides', '*.json'));

    return generatedFiles.reduce((acc, file) => {
      const overrideFile = overrideFiles.find(f => (0, _path.basename)(f) === (0, _path.basename)(file));
      const loadedSpec = JSON.parse((0, _fs.readFileSync)(file, 'utf8'));

      if (overrideFile) {
        (0, _lodash.merge)(loadedSpec, JSON.parse((0, _fs.readFileSync)(overrideFile, 'utf8')));
      }

      const spec = {};
      Object.entries(loadedSpec).forEach(([key, value]) => {
        if (acc[key]) {
          // add time to remove key collision
          spec[`${key}${Date.now()}`] = value;
        } else {
          spec[key] = value;
        }
      });
      return { ...acc,
        ...spec
      };
    }, {});
  }

  loadJsonSpec() {
    const result = this.loadJSONSpecInDir(PATH_TO_OSS_JSON_SPEC);
    this.extensionSpecFilePaths.forEach(extensionSpecFilePath => {
      (0, _lodash.merge)(result, this.loadJSONSpecInDir(extensionSpecFilePath));
    });
    Object.keys(result).forEach(endpoint => {
      this.addEndpointDescription(endpoint, result[endpoint]);
    });
  }

  loadJSSpec() {
    _lib.jsSpecLoaders.forEach(addJsSpec => addJsSpec(this));
  }

}

exports.SpecDefinitionsService = SpecDefinitionsService;