define([
	'intern!object',
	'intern/chai!assert',
	'../../../../main!tdd',
	'../../../../main',
	'../../../../lib/Suite',
	'../../../../lib/Test'
], function (registerSuite, assert, tdd, main, Suite, Test) {
	var originalExecutor = main.executor;
	var rootSuites;

	registerSuite({
		name: 'intern/lib/interfaces/tdd',

		beforeEach: function () {
			// Normally, the root suites are set up once the runner or client are configured, but we do not execute
			// the Intern under test
			rootSuites = [
				new Suite({ name: 'tdd test 1' }),
				new Suite({ name: 'tdd test 2' })
			];
			main.executor = {
				register: function (callback) {
					rootSuites.forEach(callback);
				}
			};
		},

		teardown: function () {
			main.executor = originalExecutor;
		},

		'Basic registration': function () {
			tdd.suite('root suite 1', function () {
				tdd.suite('nested suite', function () {
					tdd.test('nested test', function () {});
				});
				tdd.test('regular test', function () {});
			});

			tdd.suite('root suite 2', function () {
				tdd.test('test 2', function () {});
			});

			for (var i = 0, mainSuite; (mainSuite = rootSuites[i] && rootSuites[i].tests); ++i) {
				assert.strictEqual(mainSuite[0].name, 'root suite 1',
					'Root suite 1 should be the one named "root suite 1"');
				assert.instanceOf(mainSuite[0], Suite, 'Root suite 1 should be a Suite instance');

				assert.strictEqual(mainSuite[0].tests.length, 2, 'Root suite should have two tests');

				assert.strictEqual(mainSuite[0].tests[0].name, 'nested suite',
					'First test of root suite should be the one named "nested suite"');
				assert.instanceOf(mainSuite[0].tests[0], Suite, 'Nested test suite should be a Suite instance');

				assert.strictEqual(mainSuite[0].tests[0].tests.length, 1, 'Nested suite should only have one test');

				assert.strictEqual(mainSuite[0].tests[0].tests[0].name, 'nested test',
					'Test in nested suite should be the one named "test nested suite');
				assert.instanceOf(mainSuite[0].tests[0].tests[0], Test,
					'Test in nested suite should be a Test instance');

				assert.strictEqual(mainSuite[0].tests[1].name, 'regular test',
					'Last test in root suite should be the one named "regular test"');
				assert.instanceOf(mainSuite[0].tests[1], Test, 'Last test in root suite should a Test instance');

				assert.strictEqual(mainSuite[1].name, 'root suite 2',
					'Root suite 2 should be the one named "root suite 2"');
				assert.instanceOf(mainSuite[1], Suite, 'Root suite 2 should be a Suite instance');

				assert.strictEqual(mainSuite[1].tests.length, 1, 'Root suite 2 should have one test');

				assert.strictEqual(mainSuite[1].tests[0].name, 'test 2',
					'The test in root suite 2 should be the one named "test 2"');
				assert.instanceOf(mainSuite[1].tests[0], Test, 'test 2 should be a Test instance');
			}
		},

		'Suite lifecycle methods': function () {
			var results = [];
			var expectedResults = [
				'before', undefined, 'before2', undefined,
				'beforeEach', 'single test', 'beforeEach2', 'single test',
				'afterEach', 'single test', 'afterEach2', 'single test',
				'after', undefined, 'after2', undefined
			];
			var lifecycleMethods = [ 'before', 'beforeEach', 'afterEach', 'after' ];

			tdd.suite('root suite', function () {
				lifecycleMethods.forEach(function (method) {
					tdd[method](function (test) {
						results.push(method, test && test.name);
					});
					tdd[method](function (test) {
						results.push(method + '2', test && test.name);
					});
				});

				tdd.test('single test', function () {});
			});

			return rootSuites[0].run().then(function () {
				assert.deepEqual(results, expectedResults,
					'TDD interface should correctly register special lifecycle methods on the Suite');
			});
		}
	});
});
