define(function (require) {

  function ConfigTemplate(templates) {
    this.current = null;

    this.toggle = function (name) {
      var toSwitch = templates[name];
      if (this.current === toSwitch) {
        this.current = null;
        return false;
      } else {
        this.current = toSwitch;
        return true;
      }
    };

    this.close = function (name) {
      var toClose = templates[name];
      if (this.current === toClose) {
        this.current = null;
      }
    };

    this.toString = function () {
      return this.current;
    };
  }

  return ConfigTemplate;

});