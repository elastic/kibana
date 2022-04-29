"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EmbeddableTypes = exports.DatasetStatusTypes = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
let DatasetStatusTypes;
exports.DatasetStatusTypes = DatasetStatusTypes;

(function (DatasetStatusTypes) {
  DatasetStatusTypes["NOT_INSTALLED"] = "not_installed";
  DatasetStatusTypes["INSTALLED"] = "installed";
  DatasetStatusTypes["UNKNOWN"] = "unknown";
})(DatasetStatusTypes || (exports.DatasetStatusTypes = DatasetStatusTypes = {}));

let EmbeddableTypes;
exports.EmbeddableTypes = EmbeddableTypes;

(function (EmbeddableTypes) {
  EmbeddableTypes["MAP_SAVED_OBJECT_TYPE"] = "map";
  EmbeddableTypes["SEARCH_EMBEDDABLE_TYPE"] = "search";
  EmbeddableTypes["VISUALIZE_EMBEDDABLE_TYPE"] = "visualization";
})(EmbeddableTypes || (exports.EmbeddableTypes = EmbeddableTypes = {}));