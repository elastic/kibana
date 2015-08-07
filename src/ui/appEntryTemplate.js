
module.exports = require('lodash').template(
`
/**
 * Optimized application entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: <%= JSON.stringify(env.context) %>
<%

  env.pluginInfo.sort().forEach(function (plugin) {
    print(\` *  - \${plugin}\n\`);
  });

%> *
 */

require('ui/chrome');
<%

bundle.modules.forEach(function (id) {

  if (id !== 'ui/chrome') {
    print(\`require('\${id}');\n\`);
  }

});

%>
require('ui/chrome').bootstrap(/* xoxo */);
`
);
