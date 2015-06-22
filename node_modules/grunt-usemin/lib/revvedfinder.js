'use strict';
var debug = require('debug')('revvedfinder');
var path = require('path');
var _ = require('lodash');

// Allow to find, on disk, the revved version of a furnished file
//
// +locator+ : this is either:
//    - a hash mapping files with their revved versions
//    - a function that will return a list of file matching a given pattern (for example grunt.file.expand)
//
var RevvedFinder = module.exports = function (locator) {
  if (_.isFunction(locator)) {
    debug('using function locator');
    this.expandfn = locator;
  } else {
    debug('using file locator %s', locator);
    this.mapping = locator;
  }
};

var regexpQuote = function (str) {
  return (str + '').replace(/([.?*+\^$\[\]\\(){}|\-])/g, '\\$1');
};

RevvedFinder.prototype.getCandidatesFromMapping = function (file, searchPaths) {
  var dirname = path.dirname(file);
  var filepath = dirname === '.' ? '' : dirname + '/';
  var candidates = [];
  var self = this;

  searchPaths.forEach(function (sp) {
    var key = path.normalize(path.join(sp, file));
    debug('Looking at mapping for %s (from %s/%s)', key, sp, file);

    if (self.mapping[key]) {
      // We need to transform the actual file to a form that matches the one we received
      // For example if we received file 'foo/images/test.png' with searchPaths == ['dist'],
      // and found in mapping that 'dist/foo/images/test.png' has been renamed
      // 'dist/foo/images/test.1234.png' by grunt-rev, then we need to return
      // 'foo/images/test.1234.png'
      var cfile = path.basename(self.mapping[key]);
      candidates.push(filepath + cfile);
      debug('Found a candidate: %s/%s', dirname, cfile);
    }
  });

  return candidates;
};

RevvedFinder.prototype.getCandidatesFromFS = function (file, searchPaths) {
  var extname = path.extname(file);
  var basename = path.basename(file, extname);
  var dirname = path.dirname(file);
  var hex = '[0-9a-fA-F]+';
  var regPrefix = '(' + hex + '\\.' + regexpQuote(basename) + ')';
  var regSuffix = '(' + regexpQuote(basename) + '\\.' + hex + regexpQuote(extname) + ')';
  var revvedRx = new RegExp(regPrefix + '|' + regSuffix);
  var candidates = [];
  var self = this;

  searchPaths.forEach(function (sp) {
    var searchString = path.join(sp, dirname, basename + '.*' + extname);
    var prefixSearchString = path.join(sp, dirname, '*.' + basename + extname);

    if (searchString.indexOf('#') === 0) {
      // patterns starting with # are treated as comments by the glob implementation which returns undefined,
      // which would cause an unhandled exception in self.expandfn below so the file is never written
      return;
    }

    debug('Looking for %s and %s on disk', searchString, prefixSearchString);

    var files = self.expandfn([searchString, prefixSearchString]);

    debug('Found ', files);

    // Keep only files that look like a revved file
    var goodFiles = files.filter(function (f) {
      return f.match(revvedRx);
    });

    // We must now remove the search path from the beginning, and add them to the
    // list of candidates
    goodFiles.forEach(function (gf) {
      var goodFileName = path.basename(gf);
      if (!file.match(/\//)) {
        // We only get a file (i.e. no dirs), so let's send back
        // what we found
        debug('Adding %s to candidates', goodFileName);
        candidates.push(goodFileName);
      } else {
        debug('Adding %s / %s to candidates', dirname, goodFileName);
        candidates.push(dirname + '/' + goodFileName);
      }
    });
  });

  return candidates;
};


// Finds out candidates for file in the furnished searchPaths.
// It should return an array of candidates that are in the same format as the
// furnished file.
// For example, when given file 'images/test.png', and searchPaths of ['dist']
// the returned array should be something like ['images/test.1234.png']
//
RevvedFinder.prototype.getRevvedCandidates = function (file, searchPaths) {
  var candidates;

  // Our strategy depends on what we get at creation time: either a mapping, and we "just"
  // need to do look-up in the mapping, or an expand function and we need to find relevant files
  // on the disk
  // FIXME:

  if (this.mapping) {
    debug('Looking at mapping');
    candidates = this.getCandidatesFromMapping(file, searchPaths);
  } else {
    debug('Looking on disk');
    candidates = this.getCandidatesFromFS(file, searchPaths);
  }

  return candidates;
};

//
// Find a revved version of +ofile+ (i.e. a file which name is ending with +ofile+), relatively
// to the furnished +searchDirs+.
// Let's imagine you have the following directory structure:
//  + build
//  |  |
//  |  +- css
//  |      |
//  |      + style.css
//  + images
//     |
//     + pic.2123.png
//
// and that somehow style.css is referencing '../../images/pic.png'
// When called like that:
//   revvedFinder.find('../../images/pic.png', 'build/css');
// the function must return
// '../../images/pic.2123.png'
//
// Note that +ofile+ should be a relative path to the looked for file
// (i.e. if it's an absolue path -- starting with / -- or an external one -- containing :// -- then
//  the original file is returned)
//
// It returns an object with 2 attributes:
//  name: which is the filename
//  base: which is the directory from searchDirs where we found the file
//
RevvedFinder.prototype.find = function find(ofile, searchDirs) {
  var file = ofile;
  var searchPaths = searchDirs;
  var absolute;
  var prefix;

  if (_.isString(searchDirs)) {
    searchPaths = [searchDirs];
  }

  debug('Looking for revved version of %s in ', ofile, searchPaths);

  //do not touch external files or the root
  // FIXME: Should get only relative files
  if (ofile.match(/:\/\//) || ofile === '') {
    return ofile;
  }

  if (file[0] === '/') {
    // We need to remember this is an absolute file, but transform it
    // to a relative one
    absolute = true;
    file = file.replace(/^(\/+)/, function (match, header) {
      prefix = header;
      return '';
    });
  }

  var filepaths = this.getRevvedCandidates(file, searchPaths);

  var filepath = filepaths[0];
  debug('filepath is now ', filepath);

  // not a file in temp, skip it
  if (!filepath) {
    return ofile;
  }

  // var filename = path.basename(filepath);
  // handle the relative prefix (with always unix like path even on win32)
  // if (dirname !== '.') {
  //   filename = [dirname, filename].join('/');
  // }

  if (absolute) {
    filepath = prefix + filepath;
  }

  debug('Let\'s return %s', filepath);
  return filepath;
};
