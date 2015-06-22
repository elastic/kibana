'use strict';
var replacements = exports.replacements = {};
var versions = exports.versions = {};


// AngularJS

var angularFiles = [
  'angular',
  'angular-cookies',
  'angular-loader',
  'angular-resource',
  'angular-sanitize'
];
var angularVersions = ['1.0.7', '1.0.6','1.0.5', '1.0.4', '1.0.3', '1.0.2', '1.0.1', '1.1.5', '1.1.4', '1.1.3'];

angularFiles.forEach(function (file) {
  versions[file] = angularVersions;
});

angularFiles.forEach(function (item) {
  replacements[item] = {
    from: item + '/' + item + '.js',
    to: function (version) {
      return '//ajax.googleapis.com/ajax/libs/angularjs/' + version + '/' + item + '.min.js';
    }
  };
});


// jQuery

// Build up a map of versions supported by Google's CDN
// scraped from: https://developers.google.com/speed/libraries/devguide
versions.jquery = ['2.0.3', '2.0.2', '2.0.1', '2.0.0', '1.10.2', '1.10.1', '1.10.0', '1.9.1', '1.9.0', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8.0', '1.7.2', '1.7.1', '1.7.0', '1.6.4', '1.6.3', '1.6.2', '1.6.1', '1.6.0', '1.5.2', '1.5.1', '1.5.0', '1.4.4', '1.4.3', '1.4.2', '1.4.1', '1.4.0', '1.3.2', '1.3.1', '1.3.0', '1.2.6', '1.2.3'];
replacements.jquery = {
  from: 'jquery/jquery.js',
  to: function (version) {
    return '//ajax.googleapis.com/ajax/libs/jquery/' + version + '/jquery.min.js';
  }
};


// jQuery UI
versions['jquery-ui'] = ['1.10.3', '1.10.2', '1.10.1', '1.10.0', '1.9.2', '1.9.1',
  '1.9.0', '1.8.24', '1.8.23', '1.8.22', '1.8.21', '1.8.20', '1.8.19', '1.8.18',
  '1.8.17', '1.8.16', '1.8.15', '1.8.14', '1.8.13', '1.8.12', '1.8.11',
  '1.8.10', '1.8.9', '1.8.8', '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.2',
  '1.8.1', '1.8.0', '1.7.3', '1.7.2', '1.7.1', '1.7.0', '1.6.0', '1.5.3',
  '1.5.2'];
replacements['jquery-ui'] = {
  from: 'jquery-ui/ui/jquery-ui.js',
  to: function (version) {
    return '//ajax.googleapis.com/ajax/libs/jqueryui/' + version + '/jquery-ui.min.js';
  }
};


// TODO: Dojo, etc.
