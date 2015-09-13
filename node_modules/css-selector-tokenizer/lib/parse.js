"use strict";

var Parser = require("fastparse");

function unescape(str) {
	return str.replace(/\\(.)/g, "$1");
}

function commentMatch(match, content) {
	this.selector.nodes.push({
		type: "comment",
		content: content
	});
}

function typeMatch(type) {
	return function(match, name) {
		this.selector.nodes.push({
			type: type,
			name: unescape(name)
		});
	};
}

function pseudoClassStartMatch(match, name) {
	var newToken = {
		type: "pseudo-class",
		name: unescape(name),
		content: ""
	};
	this.selector.nodes.push(newToken);
	this.token = newToken;
	this.brackets = 1;
	return "inBrackets";
}

function nestedPseudoClassStartMatch(match, name, after) {
	var newSelector = {
		type: "selector",
		nodes: []
	};
	var newToken = {
		type: "nested-pseudo-class",
		name: unescape(name),
		nodes: [newSelector]
	};
	if(after) {
		newSelector.before = after;
	}
	this.selector.nodes.push(newToken);
	this.stack.push(this.root);
	this.root = newToken;
	this.selector = newSelector;
}

function nestedEnd(match, before) {
	if(this.stack.length > 0) {
		if(before) {
			this.selector.after = before;
		}
		this.root = this.stack.pop();
		this.selector = this.root.nodes[this.root.nodes.length - 1];
	} else {
		this.selector.nodes.push({
			type: "invalid",
			value: match
		});
	}
}

function operatorMatch(match, before, operator, after) {
	var token = {
		type: "operator",
		operator: operator
	};
	if(before) {
		token.before = before;
	}
	if(after) {
		token.after = after;
	}
	this.selector.nodes.push(token);
}

function spacingMatch(match) {
	this.selector.nodes.push({
		type: "spacing",
		value: match
	});
}

function elementMatch(match, namespace, name) {
	var newToken = {
		type: "element",
		name: unescape(name)
	};

	if(namespace) {
		newToken.namespace = unescape(namespace.substr(0, namespace.length - 1));
	}
	this.selector.nodes.push(newToken);
}

function universalMatch(match, namespace) {
	var newToken = {
		type: "universal"
	};
	if(namespace) {
		newToken.namespace = unescape(namespace.substr(0, namespace.length - 1));
	}
	this.selector.nodes.push(newToken);
}

function attributeMatch(match, content) {
	this.selector.nodes.push({
		type: "attribute",
		content: content
	});
}

function invalidMatch(match) {
	this.selector.nodes.push({
		type: "invalid",
		value: match
	});
}

function irrelevantSpacingStartMatch(match) {
	this.selector.before = match;
}

function irrelevantSpacingEndMatch(match) {
	this.selector.after = match;
}

function nextSelectorMatch(match, before, after) {
	var newSelector = {
		type: "selector",
		nodes: []
	};
	if(before) {
		this.selector.after = before;
	}
	if(after) {
		newSelector.before = after;
	}
	this.root.nodes.push(newSelector);
	this.selector = newSelector;
}

function addToCurrent(match) {
	this.token.content += match;
}

function bracketStart(match) {
	this.token.content += match;
	this.brackets++;
}

function bracketEnd(match) {
	if(--this.brackets === 0) {
		return "selector";
	}
	this.token.content += match;
}

var parser = new Parser({
	selector: {
		"/\\*([\\s\\S]*?)\\*/": commentMatch,
		"\\.((?:\\\\.|[A-Za-z_\\-])(?:\\\\.|[A-Za-z_\\-0-9])*)": typeMatch("class"),
		"#((?:\\\\.|[A-Za-z_\\-])(?:\\\\.|[A-Za-z_\\-0-9])*)": typeMatch("id"),
		":(not|matches|has|local|global)\\((\\s*)": nestedPseudoClassStartMatch,
		":((?:\\\\.|[A-Za-z_\\-0-9])+)\\(": pseudoClassStartMatch,
		":((?:\\\\.|[A-Za-z_\\-0-9])+)": typeMatch("pseudo-class"),
		"::((?:\\\\.|[A-Za-z_\\-0-9])+)": typeMatch("pseudo-element"),
		"(\\*\\|)((?:\\\\.|[A-Za-z_\\-0-9])+)": elementMatch,
		"(\\*\\|)\\*": universalMatch,
		"((?:\\\\.|[A-Za-z_\\-0-9])*\\|)?\\*": universalMatch,
		"((?:\\\\.|[A-Za-z_\\-0-9])*\\|)?((?:\\\\.|[A-Za-z_\\-])(?:\\\\.|[A-Za-z_\\-0-9])*)": elementMatch,
		"\\[([^\\]]+)\\]": attributeMatch,
		"(\\s*)\\)": nestedEnd,
		"(\\s*)((?:\\|\\|)|(?:>>)|[>+~])(\\s*)": operatorMatch,
		"(\\s*),(\\s*)": nextSelectorMatch,
		"\\s+$": irrelevantSpacingEndMatch,
		"^\\s+": irrelevantSpacingStartMatch,
		"\\s+": spacingMatch,
		".": invalidMatch
	},
	inBrackets: {
		"/\\*[\\s\\S]*?\\*/": addToCurrent,
		"\"([^\\\\\"]|\\\\.)*\"": addToCurrent,
		"'([^\\\\']|\\\\.)*'": addToCurrent,
		"[^()'\"/]+": addToCurrent,
		"\\(": bracketStart,
		"\\)": bracketEnd,
		".": addToCurrent
	}
});

function parse(str) {
	var selectorNode = {
		type: "selector",
		nodes: []
	};
	var rootNode = {
		type: "selectors",
		nodes: [
			selectorNode
		]
	};
	parser.parse("selector", str, {
		stack: [],
		root: rootNode,
		selector: selectorNode
	});
	return rootNode;
}

module.exports = parse;
