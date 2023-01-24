/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import {
  SharedComponent,
  ConstantComponent,
  AcceptEndpointComponent,
  ListComponent,
  SimpleParamComponent,
} from '.';

import { FullRequestComponent } from './full_request_component';

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
export class UrlPatternMatcher {
  // This is not really a component, just a handy container to make iteration logic simpler
  constructor(parametrizedComponentFactories) {
    // We'll group endpoints by the methods which are attached to them,
    //to avoid suggesting endpoints that are incompatible with the
    //method that the user has entered.
    ['HEAD', 'GET', 'PUT', 'POST', 'DELETE'].forEach((method) => {
      this[method] = {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: parametrizedComponentFactories || {
          getComponent: () => {},
        },
      };
    });
  }
  addEndpoint(pattern, endpoint) {
    endpoint.methods.forEach((method) => {
      let c;
      let activeComponent = this[method].rootComponent;
      if (endpoint.template) {
        new FullRequestComponent(pattern + '[body]', activeComponent, endpoint.template);
      }
      const endpointComponents = endpoint.url_components || {};
      const partList = pattern.split('/');
      _.each(partList, (part, partIndex) => {
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
              c = new ListComponent(part, c, activeComponent);
            } else if (_.isObject(c) && c.type === 'list') {
              c = new ListComponent(
                part,
                c.list,
                activeComponent,
                c.multiValued,
                c.allow_non_valid
              );
            } else {
              console.warn('incorrectly configured url component ', part, ' in endpoint', endpoint);
              c = new SharedComponent(part);
            }
          } else if ((c = this[method].parametrizedComponentFactories.getComponent(part))) {
            // c is a f
            c = c(part, activeComponent);
          } else {
            // just accept whatever with not suggestions
            c = new SimpleParamComponent(part, activeComponent);
          }

          activeComponent = c;
        } else {
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
          } else {
            c = new ConstantComponent(part, activeComponent, lookAhead);
            activeComponent = c;
          }
        }
      });
      // mark end of endpoint path
      new AcceptEndpointComponent(endpoint, activeComponent);
    });
  }

  getTopLevelComponents = function (method) {
    const methodRoot = this[method];
    if (!methodRoot) {
      return [];
    }
    return methodRoot.rootComponent.next;
  };
}
