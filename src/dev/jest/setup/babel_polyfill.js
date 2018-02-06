// Note: In theory importing the polyfill should not be needed, as Babel should
// include the necessary polyfills when using `babel-preset-env`, but for some
// reason it did not work. See https://github.com/elastic/kibana/issues/14506
import '../../../babel-register/polyfill';
