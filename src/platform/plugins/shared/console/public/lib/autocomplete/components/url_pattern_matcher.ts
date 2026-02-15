/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import type { AutocompleteComponent } from './autocomplete_component';
import { isRecord } from '../../../../common/utils/record_utils';

/**
 * @param parametrizedComponentFactories a dict of the following structure
 * that will be used as a fall back for pattern parameters (i.e.: {index})
 * {
 *   indices: function (part, parent) {
 *      return new SharedComponent(part, parent)
 *   }
 * }
 * @constructor
 */
export class UrlPatternMatcher {
  // This is not really a component, just a handy container to make iteration logic simpler
  private readonly byMethod: Record<HttpMethod, MethodRoot>;

  constructor(parametrizedComponentFactories?: ParametrizedComponentFactories) {
    // We'll group endpoints by the methods which are attached to them,
    // to avoid suggesting endpoints that are incompatible with the
    // method that the user has entered.
    const defaultFactories: ParametrizedComponentFactories = {
      getComponent: () => undefined,
    };

    const factories = parametrizedComponentFactories ?? defaultFactories;

    this.byMethod = {
      HEAD: {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: factories,
      },
      GET: {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: factories,
      },
      PUT: {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: factories,
      },
      POST: {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: factories,
      },
      DELETE: {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: factories,
      },
      PATCH: {
        rootComponent: new SharedComponent('ROOT'),
        parametrizedComponentFactories: factories,
      },
    };
  }

  addEndpoint(pattern: string, endpoint: EndpointLike) {
    endpoint.methods.forEach((method) => {
      if (!isHttpMethod(method)) {
        return;
      }

      let activeComponent = this.byMethod[method].rootComponent;
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
            const existing = activeComponent.getComponent(part);
            if (existing) {
              activeComponent = existing;
            }
            return;
          }
          // a new path, resolve.

          let c: SharedComponent;
          const endpointComponent = endpointComponents[part];

          if (endpointComponent) {
            // endpoint specific. Support list
            if (Array.isArray(endpointComponent)) {
              c = new ListComponent(part, endpointComponent, activeComponent);
            } else if (
              isRecord(endpointComponent) &&
              endpointComponent.type === 'list' &&
              Array.isArray(endpointComponent.list)
            ) {
              const multiValued =
                typeof endpointComponent.multiValued === 'boolean'
                  ? endpointComponent.multiValued
                  : undefined;
              const allowNonValid =
                typeof endpointComponent.allow_non_valid === 'boolean'
                  ? endpointComponent.allow_non_valid
                  : undefined;
              c = new ListComponent(
                part,
                endpointComponent.list,
                activeComponent,
                multiValued,
                allowNonValid
              );
            } else {
              // eslint-disable-next-line no-console
              console.warn('incorrectly configured url component ', part, ' in endpoint', endpoint);
              c = new SharedComponent(part);
            }
          } else {
            const factory = this.byMethod[method].parametrizedComponentFactories.getComponent(part);
            if (typeof factory === 'function') {
              c = factory(part, activeComponent);
            } else {
              // just accept whatever with not suggestions
              c = new SimpleParamComponent(part, activeComponent);
            }
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
            const existing = activeComponent.getComponent(part);
            if (existing) {
              activeComponent = existing;
              if (existing instanceof ConstantComponent) {
                existing.addOption(lookAhead);
              }
            }
          } else {
            const c = new ConstantComponent(part, activeComponent, lookAhead);
            activeComponent = c;
          }
        }
      });
      // mark end of endpoint path
      new AcceptEndpointComponent(endpoint, activeComponent);
    });
  }

  getTopLevelComponents(method?: string | null): AutocompleteComponent[] {
    if (!method) {
      return [];
    }

    if (!isHttpMethod(method)) {
      return [];
    }

    return this.byMethod[method].rootComponent.next ?? [];
  }
}

type HttpMethod = 'HEAD' | 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH';

interface MethodRoot {
  rootComponent: SharedComponent;
  parametrizedComponentFactories: ParametrizedComponentFactories;
}

interface ParametrizedComponentFactories {
  getComponent: (
    part: string
  ) => ((part: string, parent: SharedComponent) => SharedComponent) | undefined;
}

interface EndpointLike {
  id: string;
  methods: string[];
  template?: string;
  url_components?: Record<string, unknown>;
  [key: string]: unknown;
}

const isHttpMethod = (value: string): value is HttpMethod =>
  value === 'HEAD' ||
  value === 'GET' ||
  value === 'PUT' ||
  value === 'POST' ||
  value === 'DELETE' ||
  value === 'PATCH';
