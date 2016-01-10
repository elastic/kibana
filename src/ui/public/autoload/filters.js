const context = require.context('../filters', false, /[\/\\](?!\.|_)[^\/\\]+\.js/);
context.keys().forEach(key => context(key));
