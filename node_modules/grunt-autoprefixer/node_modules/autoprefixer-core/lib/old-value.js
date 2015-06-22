(function() {
  var OldValue, utils;

  utils = require('./utils');

  OldValue = (function() {
    function OldValue(name, string, regexp) {
      this.name = name;
      this.string = string;
      this.regexp = regexp;
      this.regexp || (this.regexp = utils.regexp(this.name));
      this.string || (this.string = this.name);
    }

    OldValue.prototype.check = function(value) {
      if (value.indexOf(this.string) !== -1) {
        return !!value.match(this.regexp);
      } else {
        return false;
      }
    };

    return OldValue;

  })();

  module.exports = OldValue;

}).call(this);
