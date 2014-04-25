define(function (require) {

  function ConfigTemplate(templates) {
    var template = this;
    template.current = null;

    template.toggle = function (name) {
      var toSwitch = templates[name];
      if (template.current === toSwitch) {
        template.current = null;
        return false;
      } else {
        template.current = toSwitch;
        return true;
      }
    };

    template.close = function (name) {
      var toClose = templates[name];
      if (template.current === toClose) {
        template.current = null;
      }
    };

    template.toString = function () {
      return template.current;
    };
  }

  return ConfigTemplate;

});