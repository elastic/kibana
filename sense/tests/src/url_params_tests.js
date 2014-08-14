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



define([
  '_',
  'autocomplete/url_params',
  'autocomplete/engine'
], function (_, url_params, autocomplete_engine) {
  'use strict';

  module("Url params");

  function param_test(name, description, tokenPath, expectedContext, globalParams) {

    test(name, function () {
      var urlParams = new url_params.UrlParams(description, globalParams || {});
      if (typeof tokenPath === "string") {
        tokenPath = _.map(tokenPath.split("/"), function (p) {
          p = p.split(",");
          if (p.length === 1) {
            return p[0];
          }
          return p;
        });
      }

      if (expectedContext.autoCompleteSet) {
        expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
          if (_.isString(t)) {
            t = { name: t}
          }
          return t;
        });
        expectedContext.autoCompleteSet = _.sortBy(expectedContext.autoCompleteSet, 'name');
      }

      var context = {};

      autocomplete_engine.populateContext(tokenPath, context, null,
        expectedContext.autoCompleteSet, urlParams.getTopLevelComponents()
      );


      if (context.autoCompleteSet) {
        context.autoCompleteSet = _.sortBy(context.autoCompleteSet, 'name');
      }

      deepEqual(context, expectedContext);
    });

  }

  function t(name, meta, insert_value) {
    var r = name;
    if (meta) {
      r = {name: name, meta: meta};
      if (meta === "param" && !insert_value) {
        insert_value = name + "=";
      }
    }
    if (insert_value) {
      if (_.isString(r)) {
        r = {name: name}
      }
      r.insert_value = insert_value;
    }
    return r;
  }

  (function () {
    var params = {
      "a": ["1", "2"],
      "b": "__flag__"
    };
    param_test("settings params",
      params,
      "a/1",
      { "a": ["1"]}
    );

    param_test("autocomplete top level",
      params,
      [],
      { autoCompleteSet: [ t("a", "param"), t("b", "flag")]}
    );

    param_test("autocomplete top level, with defaults",
      params,
      [],
      { autoCompleteSet: [ t("a", "param"), t("b", "flag"), t("c", "param")]},
      {
        "c": [2]
      }
    );

    param_test("autocomplete values",
      params,
      "a",
      { autoCompleteSet: [ t("1", "a"), t("2", "a")]}
    );

    param_test("autocomplete values flag",
      params,
      "b",
      { autoCompleteSet: [ t("true", "b"), t("false", "b")]}
    );


  })();
});