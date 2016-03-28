'use strict';

var decamelize = require('decamelize');
var defined = require('defined');
var postcss = require('postcss');
var warnOnce = require('./lib/warnOnce');

var processors = {
    postcssFilterPlugins: function () {
        return require('postcss-filter-plugins')({silent: true});
    },
    postcssDiscardComments: {fn: require('postcss-discard-comments'), ns: 'comments'},
    autoprefixer: require('autoprefixer-core'),
    postcssZindex: {fn: require('postcss-zindex')},
    postcssMinifyFontWeight: require('postcss-minify-font-weight'),
    postcssConvertValues: require('postcss-convert-values'),
    postcssCalc: {fn: require('postcss-calc')},
    postcssColormin: require('postcss-colormin'),
    postcssOrderedValues: require('postcss-ordered-values'),
    filterOptimiser: require('./lib/filterOptimiser'),
    postcssMinifySelectors: require('postcss-minify-selectors'),
    postcssSingleCharset: require('postcss-single-charset'),
    // font-family should be run before discard-unused
    postcssFontFamily: {fn: require('postcss-font-family'), ns: 'fonts'},
    postcssDiscardUnused: {fn: require('postcss-discard-unused'), ns: 'unused'},
    postcssNormalizeUrl: {fn: require('postcss-normalize-url'), ns: 'urls'},
    core: require('./lib/core'),
    // Optimisations after this are sensitive to previous optimisations in
    // the pipe, such as whitespace normalising/selector re-ordering
    postcssMergeIdents: {fn: require('postcss-merge-idents'), ns: 'idents'},
    postcssReduceIdents: {fn: require('postcss-reduce-idents'), ns: 'idents'},
    postcssMergeLonghand: require('postcss-merge-longhand'),
    postcssDiscardDuplicates: require('postcss-discard-duplicates'),
    functionOptimiser: require('./lib/functionOptimiser'),
    postcssMergeRules: {fn: require('postcss-merge-rules'), ns: 'merge'},
    postcssDiscardEmpty: require('postcss-discard-empty'),
    postcssUniqueSelectors: require('postcss-unique-selectors'),
    styleCache: require('./lib/styleCache')
};

var cssnano = postcss.plugin('cssnano', function (options) {
    options = options || {};

    var proc = postcss();
    var plugins = Object.keys(processors);
    var len = plugins.length;
    var i = 0;

    while (i < len) {
        var plugin = plugins[i++];
        var processor = processors[plugin];
        var method = processor;

        var shortName = plugin.replace('postcss', '');
        shortName = shortName.slice(0, 1).toLowerCase() + shortName.slice(1);

        if (typeof processor !== 'function') {
            if (typeof options[processor.ns] !== 'undefined') {
                warnOnce('The ' + processor.ns + ' option is deprecated. ' +
                         'Please use options.' + shortName + ' instead.');
                options[plugin] = options[processor.ns];
            }
            method = processor.fn;
        }

        var opts = defined(
            options[shortName],
            options[plugin],
            options[decamelize(plugin, '-')],
            {}
        );

        if (opts === false || opts.disable) {
            continue;
        }

        if (plugin === 'autoprefixer') {
            opts.add = false;
        }

        proc.use(method(opts));
    }

    return proc;
});

module.exports = cssnano;

module.exports.process = function (css, options) {
    options = options || {};
    options.map = options.map || (options.sourcemap ? true : null);
    var result = postcss([cssnano(options)]).process(css, options);
    // return a css string if inline/no sourcemap.
    if (options.map === null || options.map === true || (options.map && options.map.inline)) {
        return result.css;
    }
    // otherwise return an object of css & map
    return result;
};
