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

import _ from 'lodash';
import { SharedComponent } from './index';
/**
 * @param constants list of components that represent constant keys
 * @param patternsAndWildCards list of components that represent patterns and should be matched only if
 * there is no constant matches
 */
export class ObjectComponent extends SharedComponent {
  constructor(name, constants, patternsAndWildCards) {
    super(name);
    this.constants = constants;
    this.patternsAndWildCards = patternsAndWildCards;
  }
  getTerms(context, editor) {
    const options = [];
    _.each(this.constants, function (component) {
      options.push.apply(options, component.getTerms(context, editor));
    });
    _.each(this.patternsAndWildCards, function (component) {
      options.push.apply(options, component.getTerms(context, editor));
    });
    return options;
  }

  match(token, context, editor) {
    const result = {
      next: [],
    };
    _.each(this.constants, function (component) {
      const componentResult = component.match(token, context, editor);
      if (componentResult && componentResult.next) {
        result.next.push.apply(result.next, componentResult.next);
      }
    });

    // try to link to GLOBAL rules
    const globalRules = context.globalComponentResolver(token, false);
    if (globalRules) {
      result.next.push.apply(result.next, globalRules);
    }

    if (result.next.length) {
      return result;
    }
    _.each(this.patternsAndWildCards, function (component) {
      const componentResult = component.match(token, context, editor);
      if (componentResult && componentResult.next) {
        result.next.push.apply(result.next, componentResult.next);
      }
    });

    return result;
  }
}
