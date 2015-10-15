/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */

let _ = require("../public/webpackShims/_");

'use strict';

/**
 *
 * @param name
 */
function Api(name) {
  this.globalRules = {};
  this.endpoints = {};
  this.name = name;
}

(function (cls) {
  cls.addGlobalAutocompleteRules = function (parentNode, rules) {
    this.globalRules[parentNode] = rules;
  };

  cls.addEndpointDescription = function (endpoint, description) {
    if (this.endpoints[endpoint]) {
      throw new Error("endpoint [" + endpoint + "] is already registered");
    }

    var copiedDescription = {};
    _.extend(copiedDescription, description || {});
    _.defaults(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET']
    });
    this.endpoints[endpoint] = copiedDescription;
  };

  cls.asJson = function () {
    return {
      "name": this.name,
      "globals": this.globalRules,
      "endpoints": this.endpoints
    }
  };

}(Api.prototype));

module.exports = Api;
