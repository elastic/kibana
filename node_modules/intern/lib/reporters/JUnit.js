/**
 * There is no formal spec for this format and everyone does it differently, so good luck! We've mashed as many of the
 * different incompatible JUnit/xUnit XSDs as possible into one reporter.
 */
define([
	'../util'
], function (util) {
	/**
	 * Simple XML generator.
	 * @constructor
	 * @param {string} nodeName The node name.
	 * @param {Object?} attributes Optional attributes.
	 */
	function XmlNode(nodeName, attributes) {
		this.nodeName = nodeName;

		if (attributes && attributes.childNodes) {
			this.childNodes = attributes.childNodes;
			attributes.childNodes = undefined;
		}
		else {
			this.childNodes = [];
		}

		this.attributes = attributes || {};
	}

	XmlNode.prototype = {
		constructor: XmlNode,
		nodeName: '',
		childNodes: [],
		attributes: {},

		/**
		 * Creates a new XML node and pushes it to the end of the current node.
		 * @param {string} nodeName The node name for the new node.
		 * @param {Object?} attributes Optional attributes for the new node.
		 * @param {(XmlNode|string)[]?} childNodes Optional child nodes for the new node.
		 * @returns {XmlNode} A new node.
		 */
		createNode: function (nodeName, attributes) {
			var node = new XmlNode(nodeName, attributes);
			this.childNodes.push(node);
			return node;
		},

		_escape: function (string) {
			return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
		},

		_serializeAttributes: function () {
			var attributes = this.attributes;
			var nodes = [];

			for (var key in attributes) {
				if (attributes[key] != null) {
					nodes.push(key + '="' + this._escape(attributes[key]) + '"');
				}
			}

			return nodes.length ? ' ' + nodes.join(' ') : '';
		},

		_serializeContent: function () {
			var nodeList = this.childNodes;
			var nodes = [];
			for (var i = 0, j = nodeList.length; i < j; ++i) {
				nodes.push(typeof nodeList[i] === 'string' ? this._escape(nodeList[i]) : nodeList[i].toString());
			}

			return nodes.join('');
		},

		/**
		 * Outputs the node as a serialised XML string.
		 * @returns {string}
		 */
		toString: function () {
			var children = this._serializeContent();

			return '<' + this.nodeName + this._serializeAttributes() +
				(children.length ? '>' + children + '</' + this.nodeName + '>' : '/>');
		}
	};

	function createSuiteNode(suite) {
		return new XmlNode('testsuite', {
			name: suite.name || 'Node.js',
			failures: suite.numFailedTests,
			skipped: suite.numSkippedTests,
			tests: suite.numTests,
			time: suite.timeElapsed / 1000,
			childNodes: suite.tests.map(createTestNode)
		});
	}

	function createTestNode(test) {
		if (test.tests) {
			return createSuiteNode(test);
		}

		var node = new XmlNode('testcase', {
			name: test.name,
			time: test.timeElapsed / 1000,
			status: test.error ? 1 : 0
		});

		if (test.error) {
			node.createNode(test.error.name === 'AssertionError' ? 'failure' : 'error', {
				childNodes: [ util.getErrorMessage(test.error) ],
				message: test.error.message,
				type: test.error.name
			});
		}
		else if (test.skipped != null) {
			node.createNode('skipped', {
				childNodes: [ test.skipped ]
			});
		}

		return node;
	}

	function JUnit(config) {
		config = config || {};

		this.output = config.output;
	}

	JUnit.prototype.runEnd = function (executor) {
		var rootNode = new XmlNode('testsuites');
		executor.suites.forEach(function (suite) {
			rootNode.childNodes.push(createSuiteNode(suite));
		});

		var report = '<?xml version="1.0" encoding="UTF-8" ?>' + rootNode.toString() + '\n';
		this.output.end(report);
	};

	return JUnit;
});
