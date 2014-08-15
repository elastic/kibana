define(function (require) {
  return function ConfigGroupFactory() {
    var _ = require('lodash');

    function ConfigGroup(def, visTypeDef) {
      this.def = def;

      this.list = [];
      this.name = this.def.name;

      this.setTypeDef(visTypeDef);
    }

    // /**
    //  * Update properties that can be overridden by the typeDef
    //  *
    //  * @param {visTypeDef} typeDef
    //  */
    // ConfigGroup.prototype.setTypeDef = function (typeDef) {
    //   var merged = _.merge({},
    //     typeDef.configGroupDefs.byName[this.def.name],
    //     this.def
    //   );

    //   this.min = merged.min || 0;
    //   this.max = merged.max || Infinity;
    //   this.label = merged.label || '';
    // };

    ConfigGroup.prototype.add =
    ConfigGroup.prototype.move =
    ConfigGroup.prototype.remove = function (config) {
      throw new Error('not implemented');
    };

    return ConfigGroup;
  };
});