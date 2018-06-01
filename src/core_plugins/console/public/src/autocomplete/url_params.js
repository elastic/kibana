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

export function ParamComponent(name, parent, description) {
  engine.ConstantComponent.call(this, name, parent);
  this.description = description;
}

ParamComponent.prototype = _.create(engine.ConstantComponent.prototype, { 'constructor': ParamComponent });

(function (cls) {
  cls.getTerms = function () {
    const t = { name: this.name };
    if (this.description === '__flag__') {
      t.meta = 'flag';
    }
    else {
      t.meta = 'param';
      t.insertValue = this.name + '=';
    }
    return [t];
  };

}(ParamComponent.prototype));

export function UrlParams(description, defaults) {
  // This is not really a component, just a handy container to make iteration logic simpler
  this.rootComponent = new engine.SharedComponent('ROOT');
  if (_.isUndefined(defaults)) {
    defaults = {
      'pretty': '__flag__',
      'format': ['json', 'yaml'],
      'filter_path': '',
    };
  }
  description = _.clone(description || {});
  _.defaults(description, defaults);
  _.each(description, function (pDescription, param) {
    const component = new ParamComponent(param, this.rootComponent, pDescription);
    if (Array.isArray(pDescription)) {
      new engine.ListComponent(param, pDescription, component);
    }
    else if (pDescription === '__flag__') {
      new engine.ListComponent(param, ['true', 'false'], component);
    }
  }, this);

}

(function (cls) {

  cls.getTopLevelComponents = function () {
    return this.rootComponent.next;
  };

}(UrlParams.prototype));
