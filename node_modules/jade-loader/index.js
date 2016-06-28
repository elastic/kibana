/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var dirname = path.dirname;
var loaderUtils = require("loader-utils");

module.exports = function(source) {
	this.cacheable && this.cacheable();
	var jade = require("jade");

	var utils = require("jade/lib/utils");
	var nodes = require("jade/lib/nodes");
	var filters = require("jade/lib/filters");

	var req = loaderUtils.getRemainingRequest(this).replace(/^!/, "");

	var query = loaderUtils.parseQuery(this.query);

	var loadModule = this.loadModule;
	var resolve = this.resolve;
	var loaderContext = this;
	var callback;

	var fileContents = {};
	var filePaths = {};
	function MyParser(str, filename, options) {
		this._mustBeInlined = false;
		jade.Parser.call(this, str, filename, options);
	}
	MyParser.prototype = Object.create(jade.Parser.prototype);
	MyParser.prototype.constructor = MyParser;

	var missingFileMode = false;
	function getFileContent(context, request) {
		request = loaderUtils.urlToRequest(request, query.root)
		var baseRequest = request;
		var filePath = filePaths[context + " " + request];
		if(filePath) return filePath;
		var isSync = true;
		resolve(context, request + ".jade", function(err, _request) {
			if(err) {
				resolve(context, request, function(err2, _request) {
					if(err2) return callback(err2);

					request = _request;
					next();
				});
				return;
			}

			request = _request;
			next();
			function next() {
				loadModule("-!" + path.join(__dirname, "stringify.loader.js") + "!" + request, function(err, source) {
					if(err) return callback(err);

					filePaths[context + " " + baseRequest] = request;
					fileContents[request] = JSON.parse(source);

					if(!isSync) {
						run();
					} else {
						isSync = false;
					}
				});
			}
		});
		if(isSync) {
			isSync = false;
			missingFileMode = true;
			throw "continue";
		} else {
			return filePaths[context + " " + baseRequest];
		}
	}

	MyParser.prototype.parseMixin = function() {
		this._mustBeInlined = true;
		return jade.Parser.prototype.parseMixin.call(this);
	};

	MyParser.prototype.parseBlock = function() {
		this._mustBeInlined = true;
		return jade.Parser.prototype.parseBlock.call(this);
	};

	MyParser.prototype.parseCall = function() {
		this._mustBeInlined = true;
		return jade.Parser.prototype.parseCall.call(this);
	};

	MyParser.prototype.parseExtends = function() {
		if(!callback) callback = loaderContext.async();
		if(!callback) return jade.Parser.prototype.parseExtends.call(this);

		var request = this.expect('extends').val.trim();
		var context = dirname(this.filename.split("!").pop());

		var path = getFileContent(context, request);
		var str = fileContents[path];
		var parser = new this.constructor(str, path, this.options);

		parser.blocks = this.blocks;
		parser.contexts = this.contexts;
		this.extending = parser;

		return new nodes.Literal('');
	};

	MyParser.prototype.parseInclude = function() {
		if(!callback) callback = loaderContext.async();
		if(!callback) return jade.Parser.prototype.parseInclude.call(this);

		var tok = this.expect('include');

		var request = tok.val.trim();
		var context = dirname(this.filename.split("!").pop());
		var path = getFileContent(context, request);
		var str = fileContents[path];

		// has-filter
		if (tok.filter) {
			var str = str.replace(/\r/g, '');
			var options = {filename: path};
			if (tok.attrs) {
				tok.attrs.attrs.forEach(function (attribute) {
					options[attribute.name] = constantinople.toConstant(attribute.val);
				});
			}
			str = filters(tok.filter, str, options);
			return new nodes.Literal(str);
		}

		// non-jade
		if ('.jade' != path.substr(-5)) {
			var str = str.replace(/\r/g, '');
			return new nodes.Literal(str);
		}

		var parser = new this.constructor(str, path, this.options);
		parser.dependencies = this.dependencies;

		parser.blocks = utils.merge({}, this.blocks);
		parser.included = true;

		parser.mixins = this.mixins;

		this.context(parser);
		var ast = parser.parse();
		this.context();
		ast.filename = path;

		if ('indent' == this.peek().type) {
			ast.includeBlock().push(this.block());
		} else if(!parser._mustBeInlined) {
			ast = new nodes.Code("require(" + JSON.stringify(path) + ").call(this, locals)", true, false);
			ast.line = this.line();
		}

		if(parser._mustBeInlined) this._mustBeInlined = true;

		return ast;
	}

	run();
	function run() {
		try {
			var tmplFunc = jade.compileClient(source, {
				parser: loadModule ? MyParser : undefined,
				filename: req,
				self: query.self,
				globals: ["require"].concat(query.globals || []),
				pretty: query.pretty,
				locals: query.locals,
				compileDebug: loaderContext.debug || false
			});
		} catch(e) {
			if(missingFileMode) {
				// Ignore, it'll continue after async action
				missingFileMode = false;
				return;
			}
			throw e;
		}
		var runtime = "var jade = require("+JSON.stringify(require.resolve("jade/lib/runtime"))+");\n\n";
		loaderContext.callback(null, runtime + "module.exports = " + tmplFunc.toString());
	}
}
