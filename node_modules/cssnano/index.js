'use strict';

var Postcss = require('postcss');

var processors = {
    discardComments: {fn: require('postcss-discard-comments'), ns: 'comments'},
    zindex: {fn: require('postcss-zindex'), ns: 'zindex'},
    discardEmpty: require('postcss-discard-empty'),
    minifyFontWeight: require('postcss-minify-font-weight'),
    convertValues: require('postcss-convert-values'),
    calc: {fn: require('postcss-calc'), ns: 'calc'},
    colormin: require('postcss-colormin'),
    pseudoelements: require('postcss-pseudoelements'),
    filterOptimiser: require('./lib/filterOptimiser'),
    longhandOptimiser: require('./lib/longhandOptimiser'),
    minifySelectors: require('postcss-minify-selectors'),
    singleCharset: require('postcss-single-charset'),
    // font-family should be run before discard-unused
    fontFamily: require('postcss-font-family'),
    discardUnused: {fn: require('postcss-discard-unused'), ns: 'unused'},
    normalizeUrl: require('postcss-normalize-url'),
    core: require('./lib/core'),
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    mergeIdents: {fn: require('postcss-merge-idents'), ns: 'idents'},
    reduceIdents: {fn: require('postcss-reduce-idents'), ns: 'idents'},
    borderOptimiser: require('./lib/borderOptimiser'),
    discardDuplicates: require('postcss-discard-duplicates'),
    functionOptimiser: require('./lib/functionOptimiser'),
    mergeRules: {fn: require('postcss-merge-rules'), ns: 'merge'},
    uniqueSelectors: require('postcss-unique-selectors')
};

module.exports = function cssnano(css, options) {
    if (typeof css === 'object') {
        options = css;
        css = null;
    }

    options = typeof options === 'object' ? options : {};
    options.map = options.map || (options.sourcemap ? true : null);

    var postcss = Postcss();
    var plugins = Object.keys(processors);
    var len = plugins.length;
    var i = 0;

    while (i < len) {
        var plugin = plugins[i++];
        var processor = processors[plugin];
        var opts = options[processor.ns] || options;
        var method;
        if (typeof processor === 'function') {
            method = processor;
        } else {
            if (opts[processor.ns] === false || opts.disable) {
                continue;
            }
            method = processor.fn;
        }
        postcss.use(method(opts));
    }

    if (typeof css === 'string') {
        var result = postcss.process(css, options);
        // return a css string if inline/no sourcemap.
        if (options.map === null || options.map === true || (options.map && options.map.inline)) {
            return result.css;
        }
        // otherwise return an object of css & map
        return result;
    }

    return postcss;
};
