
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

  env.pluginInfo.sort().forEach(function (plugin) {
    print(\` *  - \${plugin}\n\`);
  });

%> *
 */

require('ui/chrome');
<%

bundle.modules
.filter(function (id) {
  return id !== 'ui/chrome';
})
.forEach(function (id, i) {

  if (i > 0) print('\\n');
  print(\`require('\${id}');\`);

});

%>
require('ui/chrome').bootstrap(/* xoxo */);
`
);
