module.exports = function (kibana) {
  let utils = require('requirefrom')('src/utils');
  let fromRoot = utils('fromRoot');

  return new kibana.Plugin({
    uiExports: {
      modules: {
        VisTimefilter: fromRoot('src/plugins/vis_timefilter/vis_timefilter'),
      }
    }
  });

};
