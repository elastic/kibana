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
