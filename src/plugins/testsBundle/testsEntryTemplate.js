
module.exports = require('lodash').template(
`
/**
 * Optimized application entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: <%= JSON.stringify(env.context) %>
 * includes code from:
<%

env.pluginInfo.sort().forEach(function (plugin, i) {
  if (i > 0) print('\\n');
  print(' *  - ' + plugin);
});

%>
 *
 */

require('ui/testHarness');
<%

bundle.modules.forEach(function (id, i) {
  if (i > 0) print('\\n');
  print(\`require('\${id.replace(/\\\\/g, '\\\\\\\\')}');\`);
});

%>
require('ui/testHarness').bootstrap(/* go! */);

`
);
