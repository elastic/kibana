'use strict';
var path = require('path');
var fs = require('fs');

// File is responsible to gather all information related to a given parsed file, as:
//  - its dir and name
//  - its content
//  - the search paths where referecned resource will be looked at
//  - the list of parsed blocks
//

//
// Returns an array object of all the directives for the given html.
// Each item of the array has the following form:
//
//
//     {
//       type: 'css',
//       dest: 'css/site.css',
//       src: [
//         'css/normalize.css',
//         'css/main.css'
//       ],
//       raw: [
//         '    <!-- build:css css/site.css -->',
//         '    <link rel="stylesheet" href="css/normalize.css">',
//         '    <link rel="stylesheet" href="css/main.css">',
//         '    <!-- endbuild -->'
//       ]
//     }
//
// Note also that dest is expressed relatively from the root. I.e., if the block starts with:
//    <!-- build:css /foo/css/site.css -->
// then dest will equal foo/css/site.css (note missing trailing /)
//
var getBlocks = function (content) {
  // start build pattern: will match
  //  * <!-- build:[target] output -->
  //  * <!-- build:[target](alternate search path) output -->
  // The following matching param are set when there's a match
  //   * 0 : the whole matched expression
  //   * 1 : the target (i.e. type)
  //   * 2 : the alternate search path
  //   * 3 : the output
  //
  var regbuild = /<!--\s*build:(\w+)(?:\(([^\)]+)\))?\s*([^\s]+)\s*-->/;
  // end build pattern -- <!-- endbuild -->
  var regend = /<!--\s*endbuild\s*-->/;

  var lines = content.replace(/\r\n/g, '\n').split(/\n/);
  var block = false;
  var sections = [];
  var last;

  lines.forEach(function (l) {
    var indent = (l.match(/^\s*/) || [])[0];
    var build = l.match(regbuild);
    var endbuild = regend.test(l);
    var startFromRoot = false;

    // discard empty lines
    if (build) {
      block = true;
      // Handle absolute path (i.e. with respect to the server root)
      // if (build[3][0] === '/') {
      //   startFromRoot = true;
      //   build[3] = build[3].substr(1);
      // }
      last = {
        type: build[1],
        dest: build[3],
        startFromRoot: startFromRoot,
        indent: indent,
        searchPath: [],
        src: [],
        raw: []
      };

      if (build[2]) {
        // Alternate search path
        last.searchPath.push(build[2]);
      }
    }
    // Check IE conditionals
    var isConditionalStart = l.match(/(<!--\[if.*\]>)(<!-->)?( -->)?/g);
    var isConditionalEnd = l.match(/(<!--\s?)?(<!\[endif\]-->)/g);
    if (block && isConditionalStart) {
      last.conditionalStart = isConditionalStart;
    }
    if (block && isConditionalEnd) {
      last.conditionalEnd = isConditionalEnd;
    }

    // switch back block flag when endbuild
    if (block && endbuild) {
      last.raw.push(l);
      sections.push(last);
      block = false;
    }

    if (block && last) {
      var asset = l.match(/(href|src)=["']([^'"]+)["']/);
      if (asset && asset[2]) {
        last.src.push(asset[2]);

        var media = l.match(/media=['"]([^'"]+)['"]/);
        // FIXME: media attribute should be present for all members of the block *and* having the same value
        if (media) {
          last.media = media[1];
        }

        // preserve defer attribute
        var defer = / defer/.test(l);
        if (defer && last.defer === false || last.defer && !defer) {
          throw new Error('Error: You are not suppose to mix deferred and non-deferred scripts in one block.');
        } else if (defer) {
          last.defer = true;
        } else {
          last.defer = false;
        }

        // preserve async attribute
        var async = / async/.test(l);
        if (async && last.async === false || last.async && !async) {
          throw new Error('Error: You are not suppose to mix asynced and non-asynced scripts in one block.');
        } else if (async) {
          last.async = true;
        } else {
          last.async = false;
        }

        // RequireJS uses a data-main attribute on the script tag to tell it
        // to load up the main entry point of the amp app
        //
        // If we find one, we must record the name of the main entry point,
        // as well the name of the destination file, and treat
        // the furnished requirejs as an asset (src)
        var main = l.match(/data-main=['"]([^'"]+)['"]/);
        if (main) {
          throw new Error('require.js blocks are no more supported.');
        }
      }
      last.raw.push(l);
    }
  });

  return sections;
};


module.exports = function (filepath) {
  this.dir = path.dirname(filepath);
  this.name = path.basename(filepath);
  // By default referenced content will be looked at relative to the location
  // of the file
  this.searchPath = [this.dir];
  this.content = fs.readFileSync(filepath).toString();

  // Let's parse !!!
  this.blocks = getBlocks(this.content);
};
