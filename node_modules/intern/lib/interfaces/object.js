define([
	'dojo/aspect',
	'../../main',
	'../Suite',
	'../Test'
], function (aspect, main, Suite, Test) {
	function registerSuite(descriptor, parentSuite) {
		/* jshint maxcomplexity: 13 */
		var suite = new Suite({ parent: parentSuite });
		var tests = suite.tests;
		var test;
		var k;

		parentSuite.tests.push(suite);

		for (k in descriptor) {
			test = descriptor[k];

			if (k === 'before') {
				k = 'setup';
			}
			if (k === 'after') {
				k = 'teardown';
			}

			switch (k) {
			case 'name':
			case 'timeout':
				suite[k] = test;
				break;
			case 'setup':
			case 'beforeEach':
			case 'afterEach':
			case 'teardown':
				aspect.on(suite, k, test);
				break;
			default:
				if (typeof test !== 'function') {
					test.name = test.name || k;
					registerSuite(test, suite);
				}
				else {
					tests.push(new Test({ name: k, test: test, parent: suite }));
				}
			}
		}
	}

	return function (mainDescriptor) {
		main.executor.register(function (suite) {
			var descriptor = mainDescriptor;

			// enable per-suite closure, to match feature parity with other interfaces like tdd/bdd more closely;
			// without this, it becomes impossible to use the object interface for functional tests since there is no
			// other way to create a closure for each main suite
			if (typeof descriptor === 'function') {
				descriptor = descriptor();
			}

			registerSuite(descriptor, suite);
		});
	};
});
