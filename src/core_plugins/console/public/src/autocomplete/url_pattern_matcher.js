let _ = require('lodash');
let engine = require('./engine');

module.exports.URL_PATH_END_MARKER = "__url_path_end__";


function AcceptEndpointComponent(endpoint, parent) {
  engine.SharedComponent.call(this, endpoint.id, parent);
  this.endpoint = endpoint
}

AcceptEndpointComponent.prototype = _.create(engine.SharedComponent.prototype, { "constructor": AcceptEndpointComponent });

(function (cls) {

  cls.match = function (token, context, editor) {
    if (token !== module.exports.URL_PATH_END_MARKER) {
      return null;
    }
    if (this.endpoint.methods && -1 === _.indexOf(this.endpoint.methods, context.method)) {
      return null;
    }
    var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
    r.context_values = r.context_values || {};
    r.context_values['endpoint'] = this.endpoint;
    if (_.isNumber(this.endpoint.priority)) {
      r.priority = this.endpoint.priority;
    }
    return r;
  }
})(AcceptEndpointComponent.prototype);


/**
 * @param parametrizedComponentFactories a dict of the following structure
 * that will be used as a fall back for pattern parameters (i.e.: {indices})
 * {
   *   indices: function (part, parent) {
   *      return new SharedComponent(part, parent)
   *   }
   * }
 * @constructor
 */
function UrlPatternMatcher(parametrizedComponentFactories) {
  // This is not really a component, just a handy container to make iteration logic simpler
  this.rootComponent = new engine.SharedComponent("ROOT");
  this.parametrizedComponentFactories = parametrizedComponentFactories || {};
}

(function (cls) {
  cls.addEndpoint = function (pattern, endpoint) {
    var c,
      active_component = this.rootComponent,
      endpointComponents = endpoint.url_components || {};
    var partList = pattern.split("/");
    _.each(partList, function (part, partIndex) {
      if (part.search(/^{.+}$/) >= 0) {
        part = part.substr(1, part.length - 2);
        if (active_component.getComponent(part)) {
          // we already have something for this, reuse
          active_component = active_component.getComponent(part);
          return;
        }
        // a new path, resolve.

        if ((c = endpointComponents[part])) {
          // endpoint specific. Support list
          if (_.isArray(c)) {
            c = new engine.ListComponent(part, c, active_component);
          }
          else if (_.isObject(c) && c.type === "list") {
            c = new engine.ListComponent(part, c.list, active_component, c.multi_valued, c.allow_non_valid);
          }
          else {
            console.warn("incorrectly configured url component ", part, " in endpoint", endpoint);
            c = new engine.SharedComponent(part);
          }
        }
        else if ((c = this.parametrizedComponentFactories[part])) {
          // c is a f
          c = c(part, active_component);
        }
        else {
          // just accept whatever with not suggestions
          c = new engine.SimpleParamComponent(part, active_component);
        }

        active_component = c;
      }
      else {
        // not pattern
        var lookAhead = part, s;

        for (partIndex++; partIndex < partList.length; partIndex++) {
          s = partList[partIndex];
          if (s.indexOf("{") >= 0) {
            break;
          }
          lookAhead += "/" + s;

        }

        if (active_component.getComponent(part)) {
          // we already have something for this, reuse
          active_component = active_component.getComponent(part);
          active_component.addOption(lookAhead);
        }
        else {
          c = new engine.ConstantComponent(part, active_component, lookAhead);
          active_component = c;
        }
      }
    }, this);
    // mark end of endpoint path
    new AcceptEndpointComponent(endpoint, active_component);
  };

  cls.getTopLevelComponents = function () {
    return this.rootComponent.next;
  }

})(UrlPatternMatcher.prototype);

module.exports.UrlPatternMatcher = UrlPatternMatcher;
