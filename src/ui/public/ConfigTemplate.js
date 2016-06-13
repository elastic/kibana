define(function (require) {
  const _ = require('lodash');

  function ConfigTemplate(templates) {
    const template = this;
    template.current = null;
    template.toggle = _.partial(update, null);
    template.open = _.partial(update, true);
    template.close = _.partial(update, false);

    function update(newState, name) {
      const toUpdate = templates[name];
      const curState = template.is(name);
      if (newState == null) newState = !curState;

      if (newState) {
        template.current = toUpdate;
      } else {
        template.current = null;
      }

      return newState;
    }

    template.push = function (name, tpl) {
      templates[name] = tpl;
    };

    template.is = function (name) {
      return template.current === templates[name];
    };

    template.toString = function () {
      return template.current;
    };
  }

  return ConfigTemplate;

});
