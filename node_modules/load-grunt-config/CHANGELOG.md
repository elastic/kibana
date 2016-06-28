0.19.1 / 2015-12-01
==================

  * Fixed issue with array in configPath
  * Ignored unneeded files in npm package

0.19.0 / 2015-11-01
==================

  * Removed unused async dependency
  * Updated dependencies:
    * cson from ~3.0.1 to ~3.0.2
    * glob from ~3.2.6 to ~5.0.15
    * js-yaml from ~3.0.1 to ~3.4.3
    * lodash from ~2.4.1 to ~3.10.1
  * Updated devDependencies:
    * grunt-contrib-jshint from ~0.8.0 to ~0.11.3
    * grunt-contrib-watch from ~0.5.3 to ~0.6.1
    * grunt from ~0.4.2 to ~0.4.5
    * grunt-notify from ~0.2.13 to ~0.4.1
    * grunt-gh-pages from ~0.9.0 to ~1.0.0
    * sinon from ^1.9.0 to ~1.17.2
    * proxyquire from ^0.5.3 to ~1.7.3
  * Renamed History.md to CHANGELOG.md


0.18.0 / 2015-10-31
==================

  * Updated load-grunt-tasks dependency from ~0.3.0 to ~3.3.0


0.17.2 / 2015-07-02
==================

  * Removed unnecessary loop to find fullpaths (jigardafda)
  * Updated cson and jit-grunt dependencies


0.17.1 / 2015-04-19
==================

  * Revert "load js-yaml full schema support to allow regexp"
  * Use lodash instead of lodash-node to speed up execution
  * Speed up build time when there are no yaml files


0.17.0 / 2015-04-12
==================

  * Adds a small example for adding a description to the yaml
  * Aliases to functions when the alias is an object with a description
  * Updating Readme
  * Configurable function for config merge
  * Fixed lookup for CSON files in directory
  * Updated readme regarding CSON files support
  * Support CSON config files
  * load js-yaml full schema support to allow regexp
  * Update README.md: add alias task description


0.16.0 / 2014-10-29 
==================

  * added preMerge hook.  #94

0.15.0 / 2014-10-29 
==================

  * added aliases to config-debug output. #93
  * moved config-debug output to after postProcess. #93

0.14.0 / 2014-10-19 
==================

  * Update README.md (tawez)
  * configPath accepts array of strings (tawez)
  * overridePath accepts array of strings (tawez)

0.13.2 / 2014-10-02 
==================

  * fixed issue with passing options to jit-grunt

0.13.1 / 2014-08-20 
==================

  * Fix for aliases to functions

0.13.0 / 2014-08-06 
==================

  * ability to have multiple targets in config grouping
  * added --config-debug support

0.12.0 / 2014-07-07 
==================

  * support postProcess option to change config before running through grunt

0.11.0 / 2014-07-06 
==================

  * Allow descriptions inside aliases (Belelros)

0.10.0 / 2014-06-17 
==================

  * fixed support for json config files (SolomoN-ua)
  * Allow just-in-time loading (SolomoN-ua)

0.9.2 / 2014-05-12 
==================

  * Allow group config files to return a function.
  * Livescript support

0.9.1 / 2014-05-04 
==================

  * fix for mix and matching config grouping and task based config
  * fixed readme

0.9.0 / 2014-05-04 
==================

  * added support for config groupings
  * fixed ghpage config

0.8.0 / 2014-04-16 
==================

  * re-styling readfile.js a bit.
  * Merge pull request #35 from defaude/master
  * Fixing stupid typo...
  * Using js-yaml's safeLoad for YAML files instead of a simple require. Closes #28

0.8.0beta2 / 2014-03-20 
==================

  * fixed bug where package.json wasn't getting added to config object. fixes #46

0.8.0beta1 / 2014-03-14 
==================

  * updated readme
  * fixed exposing config/data to main grunt config
  * refactored everything to be sync
  * removed legacy files
  * finished up index.js functionality and tests
  * more tests passing on index.js
  * initial work on main lib
  * feat(gruntconfig): set up method with tests
  * refactor(tests): moved fixtures into config folder, added output fixture
  * refactor(readconfigdir): use extname and basename instead of regex
  * feat(readConfigDir): added new method
  * refactor(load-config.test): skip tests for now
  * feat(readfile): check if file exists
  * readfile with tests
  * switched build files to use yaml

0.7.2 / 2014-03-12 
==================

  * Using js-yaml's safeLoad for YAML files instead of a simple require. Closes #28

0.7.1 / 2014-02-14 
==================

  * Use lodash-node instead of `grunt.util._` (shinnn)
  * Update dependencies and devDependencies (shinnn)
  * added the .yml extension as an option for loading yaml files (travi)

0.7.0 / 2013-11-11 
==================

  * added support for aliases file to easily register task aliases.  fixes #5

0.6.1 / 2013-10-31 
==================

  * use merge so empty objects don't kill settings [dylang]
  * updated readme to add coffee support
  * updated readme

0.6.0 / 2013-10-27 
==================

  * bumped load-grunt-tasks dep.  Fixes #10
  * configPath is now absolute.  Fixes #11
  * Feature: enabled coffee-script support for config files
  * updated readme

0.5.0 / 2013-10-02 
==================

  * Adding a test for functions that return options [cbas]
  * Pass grunt reference to function options [cbas]

0.4.1 / 2013-09-19 
==================

  * changed load-grunt-tasks to loadGruntTasks #7

0.4.0 / 2013-09-19 
==================

  * updated readme for load-grunt-tasks option passing. #7
  * ability to pass options to load-grunt-tasks.  fixes #7

0.3.1 / 2013-09-17 
==================

  * removed env option so it doesn't conflict with grunt-env.  fixes #6

0.3.0 / 2013-09-16 
==================

  * renamed to load-grunt-config

0.2.1 / 2013-09-15 
==================

  * fixed missing dep

0.2.0 / 2013-09-15 
==================

  * Added License.  fixes #2
  * Added support for yaml files.  fixes #3
  * typo in readme.  fixes #1

0.1.1 / 2013-09-13 
==================

  * added { config: {} } support

0.1.0 / 2013-09-13 
==================

  * working commit
  * Initial commit
