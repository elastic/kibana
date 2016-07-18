
import _ from 'lodash';
import angular from 'angular';


import metadata from 'ui/metadata';
import 'babel/polyfill';
import $ from 'jquery';
import 'ui/timefilter';
import 'ui/notify';
import 'ui/private';
import 'ui/promises';
import 'ui/directives/kbn_src';
import 'ui/watch_multi';

let chrome = {};
let internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

$('<link>').attr({
  href: require('ui/images/elk.ico'),
  rel: 'shortcut icon'
}).appendTo('head');

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
