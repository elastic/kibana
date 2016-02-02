require('babel/polyfill');

import _ from 'lodash';
var $ = require('jquery');
import angular from 'angular';

require('ui/timefilter');
require('ui/private');
require('ui/promises');

import metadata from 'ui/metadata';

var chrome = {};
var internals = _.defaults(
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
require('./api/tabs')(chrome, internals);
require('./api/template')(chrome, internals);
require('./api/theme')(chrome, internals);

chrome.bootstrap = function () {
  chrome.setupAngular();
  angular.bootstrap(document, ['kibana']);
};

module.exports = chrome;
