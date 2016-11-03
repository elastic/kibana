
import _ from 'lodash';
import angular from 'angular';


import metadata from 'ui/metadata';
import 'babel/polyfill';
import $ from 'jquery';
import 'ui/timefilter';
import 'ui/notify';
import 'ui/private';
import 'ui/promises';
import 'ui/storage';
import 'ui/directives/kbn_src';
import 'ui/watch_multi';
import './services';

const chrome = {};
const internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    devMode: true,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

// These favicons were generated from http://realfavicongenerator.net/.
// The href attributes are specified by disabling all Webpack loaders, and explicitly using
// the file loader. This way, Webpack emits all required files into the output dir and returns
// the public URL.
const favicons = [{
  tag: '<link>',
  attrs: {
    href: require('-!file!ui/favicons/favicon.ico'),
    rel: 'shortcut icon',
  },
}, {
  tag: '<link>',
  attrs: {
    href: require('-!file!ui/favicons/apple-touch-icon.png'),
    sizes: '180x180',
    rel: 'apple-touch-icon',
  },
}, {
  tag: '<link>',
  attrs: {
    href: require('-!file!ui/favicons/favicon-32x32.png'),
    type: 'image/png',
    sizes: '32x32',
    rel: 'icon',
  },
}, {
  tag: '<link>',
  attrs: {
    href: require('-!file!ui/favicons/favicon-16x16.png'),
    type: 'image/png',
    sizes: '16x16',
    rel: 'icon',
  },
}, {
  tag: '<link>',
  attrs: {
    href: require('-!file!ui/favicons/manifest.json'),
    rel: 'manifest',
  },
}, {
  tag: '<link>',
  attrs: {
    href: require('-!file!ui/favicons/safari-pinned-tab.svg'),
    color: '#e8488b',
    rel: 'mask-icon',
  },
}, {
  tag: '<meta>',
  attrs: {
    name: 'theme-color',
    content: '#e8488b',
  },
}];

favicons.forEach(favicon => {
  $(favicon.tag).attr(favicon.attrs).appendTo('head');
});

require('./api/apps')(chrome, internals);
require('./api/xsrf')(chrome, internals);
require('./api/nav')(chrome, internals);
require('./api/angular')(chrome, internals);
require('./api/controls')(chrome, internals);
require('./api/template')(chrome, internals);
require('./api/theme')(chrome, internals);

chrome.bootstrap = function () {
  chrome.setupAngular();
  angular.bootstrap(document, ['kibana']);
};

module.exports = chrome;
