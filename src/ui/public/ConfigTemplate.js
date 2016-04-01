define(function (require) {
  let _ = require('lodash');

  function ConfigTemplate(templates) {
    let template = this;
    template.current = null;
    template.toggle = _.partial(update, null);
    template.open = _.partial(update, true);
    template.close = _.partial(update, false);

    function update(newState, name) {
      let toUpdate = templates[name];
      let curState = template.is(name);
      if (newState == null) newState = !curState;

      if (newState) {
        template.current = toUpdate;
      } else {
        template.current = null;
      }

      return newState;
    }

    template.is = function (name) {
      return template.current === templates[name];
    };

    template.toString = function () {
      return template.current;
    };
  }

  return ConfigTemplate;

});
