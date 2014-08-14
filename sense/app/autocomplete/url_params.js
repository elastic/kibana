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
  "_", "exports", "./engine"
], function (_, exports, engine) {
  "use strict";

  function ParamComponent(name, parent, description) {
    engine.ConstantComponent.call(this, name, parent);
    this.description = description;
  }

  ParamComponent.prototype = _.create(engine.ConstantComponent.prototype, { "constructor": ParamComponent });
  exports.ParamComponent = ParamComponent;

  (function (cls) {
    cls.getTerms = function () {
      var t = { name: this.name };
      if (this.description === "__flag__") {
        t.meta = "flag"
      }
      else {
        t.meta = "param";
        t.insert_value = this.name + "=";
      }
      return [t];
    };

  })(ParamComponent.prototype);

  function UrlParams(description, defaults) {
    // This is not really a component, just a handy container to make iteration logic simpler
    this.rootComponent = new engine.SharedComponent("ROOT");
    if (_.isUndefined(defaults)) {
      defaults = {
        "pretty": "__flag__",
        "format": ["json", "yaml"]
      };
    }
    description = _.clone(description || {});
    _.defaults(description, defaults);
    _.each(description, function (p_description, param) {
      var values, component;
      component = new ParamComponent(param, this.rootComponent, p_description);
      if (_.isArray(p_description)) {
        values = new engine.ListComponent(param, p_description, component);
      }
      else if (p_description === "__flag__") {
        values = new engine.ListComponent(param, ["true", "false"], component);
      }
    }, this);

  }

  (function (cls) {

    cls.getTopLevelComponents = function () {
      return this.rootComponent.next;
    }

  })(UrlParams.prototype);

  exports.UrlParams = UrlParams;
});