"use strict";

var state = {
	syntax: {},

	reset: function () {
		this.tokens = {
			prev: null,
			next: null,
			curr: null
		};

		this.option = {};
		this.ignored = {};
		this.directive = {};
		this.jsonMode = false;
		this.jsonWarnings = [];
		this.lines = [];
		this.tab = "";
		this.cache = {}; // Node.JS doesn't have Map. Sniff.
		this.ignoreLinterErrors = false;    // Blank out non-multi-line-commented
											// lines when ignoring linter errors
	}
};

exports.state = state;
