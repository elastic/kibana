/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Tokenizer = require("css-selector-tokenizer");
var postcss = require("postcss");
var loaderUtils = require("loader-utils");
var getLocalIdent = require("./getLocalIdent");

var localByDefault = require("postcss-modules-local-by-default");
var extractImports = require("postcss-modules-extract-imports");
var modulesScope = require("postcss-modules-scope");
var cssnano = require("cssnano");

var parserPlugin = postcss.plugin("css-loader-parser", function(options) {
	return function(css) {
		var imports = {};
		var exports = {};
		var importItems = [];
		var urlItems = [];

		function replaceImportsInString(str) {
			var tokens = str.split(/(\S+)/);
			tokens = tokens.map(function(token) {
				var importIndex = imports["$" + token];
				if(typeof importIndex === "number") {
					return "___CSS_LOADER_IMPORT___" + importIndex + "___";
				}
				return token;
			});
			return tokens.join("");
		}

		css.eachAtRule("import", function(rule) {
			var values = Tokenizer.parseValues(rule.params);
			var url = values.nodes[0].nodes[0];
			if(url.type === "url") {
				url = url.url;
			} else if(url.type === "string") {
				url = url.value;
			} else throw rule.error("Unexpected format" + rule.params);
			values.nodes[0].nodes.shift();
			var mediaQuery = Tokenizer.stringifyValues(values);
			if(loaderUtils.isUrlRequest(url, options.root) && options.mode === "global") {
				url = loaderUtils.urlToRequest(url, options.root);
			}
			importItems.push({
				url: url,
				mediaQuery: mediaQuery
			});
			rule.removeSelf();
		});

		css.eachRule(function(rule) {
			if(rule.selector === ":export") {
				rule.eachDecl(function(decl) {
					exports[decl.prop] = decl.value;
				});
				rule.removeSelf();
			} else if(/^:import\(.+\)$/.test(rule.selector)) {
				var match = /^:import\((.+)\)$/.exec(rule.selector);
				var url = loaderUtils.parseString(match[1]);
				rule.eachDecl(function(decl) {
					imports["$" + decl.prop] = importItems.length;
					importItems.push({
						url: url,
						export: decl.value
					});
				});
				rule.removeSelf();
			}
		});

		Object.keys(exports).forEach(function(exportName) {
			exports[exportName] = replaceImportsInString(exports[exportName]);
		});

		css.eachDecl(function(decl) {
			var values = Tokenizer.parseValues(decl.value);
			values.nodes.forEach(function(value) {
				value.nodes.forEach(function(item) {
					switch(item.type) {
					case "item":
						var importIndex = imports["$" + item.name];
						if(typeof importIndex === "number") {
							item.name = "___CSS_LOADER_IMPORT___" + importIndex + "___";
						}
						break;
					case "url":
						if(!/^#/.test(item.url) && loaderUtils.isUrlRequest(item.url, options.root)) {
							item.stringType = "";
							delete item.innerSpacingBefore;
							delete item.innerSpacingAfter;
							var url = item.url;
							item.url = "___CSS_LOADER_URL___" + urlItems.length + "___";
							urlItems.push({
								url: url
							});
						}
						break;
					}
				});
			});
			decl.value = Tokenizer.stringifyValues(values);
		});
		css.eachAtRule(function(atrule) {
			if(typeof atrule.params === "string") {
				atrule.params = replaceImportsInString(atrule.params);
			}
		});

		options.importItems = importItems;
		options.urlItems = urlItems;
		options.exports = exports;
	};
});

module.exports = function processCss(inputSource, inputMap, options) {

	var query = options.query;
	var root = query.root;
	var localIdentName = query.localIdentName || "[hash:base64]";
	var localIdentRegExp = query.localIdentRegExp;
	var forceMinimize = query.minimize;
	var minimize = typeof forceMinimize !== "undefined" ? !!forceMinimize : options.minimize;

	var parserOptions = {
		root: root,
		mode: options.mode
	};

	var pipeline = postcss([
		localByDefault({
			mode: options.mode,
			rewriteUrl: function(global, url) {
				if(!loaderUtils.isUrlRequest(url, root)) {
					return url;
				}
				if(global) {
					return loaderUtils.urlToRequest(url, root);
				}
				return url;
			}
		}),
		extractImports({
			createImportedName: function(importName) {
				return "___" + importName;
			}
		}),
		modulesScope({
			generateScopedName: function(exportName) {
				return getLocalIdent(options.loaderContext, localIdentName, exportName, {
					regExp: localIdentRegExp
				});
			}
		}),
		parserPlugin(parserOptions)
	]);

	if(minimize) {
		var minimizeOptions = Object.create(query);
		["zindex", "normalizeUrl", "discardUnused", "mergeIdents", "reduceIdents"].forEach(function(name) {
			if(typeof minimizeOptions[name] === "undefined")
				minimizeOptions[name] = false;
		});
		pipeline.use(cssnano(minimizeOptions));
	}

	var result = pipeline.process(inputSource, {
		from: options.from,
		to: options.to,
		map: {
			prev: inputMap,
			sourcesContent: true,
			inline: false,
			annotation: false
		}
	});


	return {
		source: result.css,
		map: result.map && result.map.toJSON(),
		exports: parserOptions.exports,
		importItems: parserOptions.importItems,
		importItemRegExpG: /___CSS_LOADER_IMPORT___([0-9]+)___/g,
		importItemRegExp: /___CSS_LOADER_IMPORT___([0-9]+)___/,
		urlItems: parserOptions.urlItems,
		urlItemRegExpG: /___CSS_LOADER_URL___([0-9]+)___/g,
		urlItemRegExp: /___CSS_LOADER_URL___([0-9]+)___/
	};
};
