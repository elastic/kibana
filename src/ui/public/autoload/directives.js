const context = require.context('../directives', false, /[\/\\](?!\.|_)[^\/\\]+\.js/);
context.keys().forEach(key => context(key));
