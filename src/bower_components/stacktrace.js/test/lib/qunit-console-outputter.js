var module;
QUnit.moduleStart = function(context) {
	module = context.name;
}
var current_test_assertions = [];
QUnit.testDone = function(result) {
	var name = module + ": " + result.name;
	if (result.failed) {
		console.log("\u001B[31m✖ " + name);
		for (var i = 0; i < current_test_assertions.length; i++) {
			console.log("	" + current_test_assertions[i]);
		}
		console.log("\u001B[39m");
	}
	current_test_assertions = [];
};

QUnit.log = function(details) {
	if (details.result) {
		return;
	}
	var response = details.message || "";
	if (details.expected) {
		if (response) {
			response += ", ";
		}
		response = "expected: " + details.expected + ", but was: " + details.actual;
	}
	current_test_assertions.push("Failed assertion: " + response);
};

QUnit.done = function(result) {
	console.log("Took " + result.runtime + "ms to run " + result.total + " tests. \u001B[32m✔ " + result.passed + "\u001B[39m \u001B[31m✖ " + result.failed + "\u001B[39m ");
	return result.failed > 0 ? 1 : 0;
};