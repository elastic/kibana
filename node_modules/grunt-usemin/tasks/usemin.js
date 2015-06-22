'use strict';
var util = require('util');

var inspect = function (obj) {
  return util.inspect(obj, false, 4, true);
};

// Retrieve the flow config from the furnished configuration. It can be:
//  - a dedicated one for the furnished target
//  - a general one
//  - the default one
var getFlowFromConfig = function (config, target) {
  var Flow = require('../lib/flow');
  var flow = new Flow({
    steps: {
      js: ['concat', 'uglifyjs'],
      css: ['concat', 'cssmin']
    },
    post: {}
  });
  if (config.options && config.options.flow) {
    if (config.options.flow[target]) {
      flow.setSteps(config.options.flow[target].steps);
      flow.setPost(config.options.flow[target].post);
    } else {
      flow.setSteps(config.options.flow.steps);
      flow.setPost(config.options.flow.post);
    }
  }
  return flow;
};

//
// Return which locator to use to get the revisioned version (revved) of the files, with, by order of
// preference:
// - a map object passed in option (revmap)
// - a map object produced by grunt-filerev if available
// - a disk lookup
//
var getLocator = function (grunt, options) {
  var locator;
  if (options.revmap) {
    locator = grunt.file.readJSON(options.revmap);
  } else if (grunt.filerev && grunt.filerev.summary) {
    locator = grunt.filerev.summary;
  } else {
    locator = function (p) {
      return grunt.file.expand({
        filter: 'isFile'
      }, p);
    };
  }
  return locator;
};

//
// ### Usemin

// Replaces references to non-optimized scripts or stylesheets
// into a set of HTML files (or any templates/views).
//
// The users markup should be considered the primary source of information
// for paths, references to assets which should be optimized.We also check
// against files present in the relevant directory () (e.g checking against
// the revved filename into the 'temp/') directory to find the SHA
// that was generated.
//
// Todos:
// * Use a file dictionary during build process and rev task to
// store each optimized assets and their associated sha1.
//
// #### Usemin-handler
//
// A special task which uses the build block HTML comments in markup to
// get back the list of files to handle, and initialize the grunt configuration
// appropriately, and automatically.
//
// Custom HTML "block" comments are provided as an API for interacting with the
// build script. These comments adhere to the following pattern:
//
//     <!-- build:<type> <path> -->
//       ... HTML Markup, list of script / link tags.
//     <!-- endbuild -->
//
// - type: is either js or css.
// - path: is the file path of the optimized file, the target output.
//
// An example of this in completed form can be seen below:
//
//    <!-- build:js js/app.js -->
//      <script src="js/app.js"></script>
//      <script src="js/controllers/thing-controller.js"></script>
//      <script src="js/models/thing-model.js"></script>
//      <script src="js/views/thing-view.js"></script>
//    <!-- endbuild -->
//
//
// Internally, the task parses your HTML markup to find each of these blocks, and
// initializes for you the corresponding Grunt config for the concat / uglify tasks
// when `type=js`, the concat / cssmin tasks when `type=css`.
//

module.exports = function (grunt) {
  var FileProcessor = require('../lib/fileprocessor');
  var RevvedFinder = require('../lib/revvedfinder');
  var ConfigWriter = require('../lib/configwriter');
  var _ = require('lodash');

  grunt.registerMultiTask('usemin', 'Replaces references to non-minified scripts / stylesheets', function () {
    var debug = require('debug')('usemin:usemin');
    var options = this.options({
      type: this.target
    });
    var blockReplacements = options.blockReplacements || {};

    debug('Looking at %s target', this.target);
    var patterns;

    // Check if we have a user defined pattern
    if (options.patterns && options.patterns[this.target]) {
      debug('Using user defined pattern for %s', this.target);
      patterns = options.patterns[this.target];
    } else {
      debug('Using predefined pattern for %s', this.target);
      patterns = options.type;
    }

    // var locator = options.revmap ? grunt.file.readJSON(options.revmap) : function (p) { return grunt.file.expand({filter: 'isFile'}, p); };
    var locator = getLocator(grunt, options);
    var revvedfinder = new RevvedFinder(locator);
    var handler = new FileProcessor(patterns, revvedfinder, function (msg) {
      grunt.log.writeln(msg);
    }, blockReplacements);

    this.files.forEach(function (fileObj) {
      var files = grunt.file.expand({
        nonull: true
      }, fileObj.src);
      files.forEach(function (filename) {
        debug('looking at file %s', filename);

        grunt.log.subhead('Processing as ' + options.type.toUpperCase() + ' - ' + filename);

        // Our revved version locator
        var content = handler.process(filename, options.assetsDirs);

        // write the new content to disk
        grunt.file.write(filename, content);
      });
    });
  });

  grunt.registerMultiTask('useminPrepare', 'Using HTML markup as the primary source of information', function () {
    var options = this.options();
    // collect files
    var dest = options.dest || 'dist';
    var staging = options.staging || '.tmp';
    var root = options.root;

    grunt.log
      .writeln('Going through ' + grunt.log.wordlist(this.filesSrc) + ' to update the config')
      .writeln('Looking for build script HTML comment blocks');

    var flow = getFlowFromConfig(grunt.config('useminPrepare'), this.target);

    var c = new ConfigWriter(flow, {
      root: root,
      dest: dest,
      staging: staging
    });

    var cfgNames = [];
    c.stepWriters().forEach(function (i) {
      cfgNames.push(i.name);
    });
    c.postWriters().forEach(function (i) {
      cfgNames.push(i.name);
    });
    var gruntConfig = {};
    _.forEach(cfgNames, function (name) {
      gruntConfig[name] = grunt.config(name) || {};
    });

    this.filesSrc.forEach(function (filepath) {
      var config;
      try {
        config = c.process(filepath, grunt.config());
      } catch (e) {
        grunt.fail.fatal(e);
      }

      _.forEach(cfgNames, function (name) {
        gruntConfig[name] = grunt.config(name) || {};
        grunt.config(name, _.assign(gruntConfig[name], config[name]));
      });

    });

    // log a bit what was added to config
    grunt.log.subhead('Configuration is now:');
    _.forEach(cfgNames, function (name) {
      grunt.log.subhead('  ' + name + ':').writeln('  ' + inspect(grunt.config(name)));
    });
  });
};
