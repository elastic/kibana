// `babel-preset-env` looks for and rewrites the following import
// statement into a list of import statements based on the polyfills
// necessary for our target environment (the current version of node)
// but since it does that during compilation, `import 'babel-polyfill'`
// must be in a file that is loaded with `require()` AFTER `babel-register`
// is configured.
//
// This is why we have this single statement in it's own file and require
// it from ./index.js
import 'babel-polyfill';
