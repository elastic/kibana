/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const _ = require('lodash');
const engine = require('./engine');

export const URL_PATH_END_MARKER = '__url_path_end__';

function AcceptEndpointComponent(endpoint, parent) {
  engine.SharedComponent.call(this, endpoint.id, parent);
  this.endpoint = endpoint;
}

AcceptEndpointComponent.prototype = _.create(engine.SharedComponent.prototype, { 'constructor': AcceptEndpointComponent });

(function (cls) {

  cls.match = function (token, context, editor) {
    if (token !== URL_PATH_END_MARKER) {
      return null;
    }
    if (this.endpoint.methods && -1 === _.indexOf(this.endpoint.methods, context.method)) {
      return null;
    }
    const r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
    r.context_values = r.context_values || {};
    r.context_values.endpoint = this.endpoint;
    if (_.isNumber(this.endpoint.priority)) {
      r.priority = this.endpoint.priority;
    }
    return r;
  };
}(AcceptEndpointComponent.prototype));


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
export function UrlPatternMatcher(parametrizedComponentFactories) {
  // This is not really a component, just a handy container to make iteration logic simpler
  this.rootComponent = new engine.SharedComponent('ROOT');
  this.parametrizedComponentFactories = parametrizedComponentFactories || {};
}

(function (cls) {
  cls.addEndpoint = function (pattern, endpoint) {
    let c;
    let activeComponent = this.rootComponent;
    const endpointComponents = endpoint.url_components || {};
    const partList = pattern.split('/');
    _.each(partList, function (part, partIndex) {
      if (part.search(/^{.+}$/) >= 0) {
        part = part.substr(1, part.length - 2);
        if (activeComponent.getComponent(part)) {
          // we already have something for this, reuse
          activeComponent = activeComponent.getComponent(part);
          return;
        }
        // a new path, resolve.

        if ((c = endpointComponents[part])) {
          // endpoint specific. Support list
          if (Array.isArray(c)) {
            c = new engine.ListComponent(part, c, activeComponent);
          }
          else if (_.isObject(c) && c.type === 'list') {
            c = new engine.ListComponent(part, c.list, activeComponent, c.multiValued, c.allow_non_valid);
          }
          else {
            console.warn('incorrectly configured url component ', part, ' in endpoint', endpoint);
            c = new engine.SharedComponent(part);
          }
        }
        else if ((c = this.parametrizedComponentFactories[part])) {
          // c is a f
          c = c(part, activeComponent);
        }
        else {
          // just accept whatever with not suggestions
          c = new engine.SimpleParamComponent(part, activeComponent);
        }

        activeComponent = c;
      }
      else {
        // not pattern
        let lookAhead = part;
        let s;

        for (partIndex++; partIndex < partList.length; partIndex++) {
          s = partList[partIndex];
          if (s.indexOf('{') >= 0) {
            break;
          }
          lookAhead += '/' + s;

        }

        if (activeComponent.getComponent(part)) {
          // we already have something for this, reuse
          activeComponent = activeComponent.getComponent(part);
          activeComponent.addOption(lookAhead);
        }
        else {
          c = new engine.ConstantComponent(part, activeComponent, lookAhead);
          activeComponent = c;
        }
      }
    }, this);
    // mark end of endpoint path
    new AcceptEndpointComponent(endpoint, activeComponent);
  };

  cls.getTopLevelComponents = function () {
    return this.rootComponent.next;
  };

}(UrlPatternMatcher.prototype));
