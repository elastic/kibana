define([
	'intern!object',
	'intern/chai!assert',
	'../../../../main!tdd',
	'../../../../main!bdd'
], function (registerSuite, assert, tdd, bdd) {
	registerSuite({
		name: 'intern/lib/interfaces/bdd',

		// We already test all the BDD code paths by testing TDD, so long as the methods are the same, so just
		// make sure that they are actually the same
		'BDD/TDD interface equivalence check': function () {
			assert.strictEqual(tdd.suite, bdd.describe, 'bdd.describe should be an alias for tdd.suite');
			assert.strictEqual(tdd.test, bdd.it, 'bdd.it should be an alias for tdd.test');

			for (var key in { before: 1, after: 1, beforeEach: 1, afterEach: 1 }) {
				assert.strictEqual(tdd[key], bdd[key], 'bdd.' + key + ' should be an alias for tdd.' + key);
			}

			assert.isUndefined(bdd.suite, 'bdd.suite should not be defined since it is a TDD interface');
			assert.isUndefined(bdd.test, 'bdd.test should not be defined since it is a TDD interface');
		}
	});
});
