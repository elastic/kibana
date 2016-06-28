/// <reference path="../chai/chai.d.ts" />
/// <reference path="../digdug/digdug.d.ts" />
/// <reference path="../leadfoot/leadfoot.d.ts" />
/// <reference path="../dojo2/dojo.d.ts" />

declare module 'intern' {
	import main = require('intern/main');
	export = main;
}

declare module 'intern/main' {
	import Promise = require('dojo/Promise');
	import Suite = require('intern/lib/Suite');

	export interface Config {
		capabilities?: any;
		environments?: any[];
		excludeInstrumentation?: RegExp;
		functionalSuites?: string[];
		grep?: RegExp;
		loader?: {
			baseUrl?: string;
			packages?: { name: string; location: string; main?: string; }[];
			map?: { [remapModulePart: string]: { [sourceModulePart: string]: string; }; };
		};
		maxConcurrency?: number;
		proxyPort?: number;
		proxyUrl?: string;
		reporters?: string[];
		suites?: string[];
		tunnel?: string;
		tunnelOptions?: any;
		useLoader?: {
			'host-browser'?: string;
			'host-node'?: string;
		};
	}

	export var args: any;
	export var mode: string;
	export var config: Config;
	export var maxConcurrency: number;
	export var suites: Suite[];
	export var tunnel: any;
	export var grep: RegExp;
	export function run(): Promise<void>;
}

declare module 'intern!bdd' {
	import Promise = require('dojo/Promise');

	var bdd: {
		after(fn: () => any): void;
		afterEach(fn: () => any): void;
		before(fn: () => any): void;
		beforeEach(fn: () => any): void;
		describe(name: string, factory: () => void): void;
		it(name: string, test: () => any): void;
	};

	export = bdd;
}

declare module 'intern!object' {
	var createSuite: {
		(definition: {}): void;
		(definition:() => {}): void;
	};

	export = createSuite;
}

declare module 'intern!tdd' {
	import Promise = require('dojo/Promise');

	var tdd: {
		after(fn: () => any): void;
		afterEach(fn: () => any): void;
		before(fn: () => any): void;
		beforeEach(fn: () => any): void;
		suite(name: string, factory: () => void): void;
		test(name: string, test: () => any): void;
	};

	export = tdd;
}

declare module 'intern/chai!' {
	export = chai;
}

declare module 'intern/chai!assert' {
	var assert: chai.Assert;
	export = assert;
}

declare module 'intern/chai!expect' {
	var expect: chai.Expect;
	export = expect;
}

declare module 'intern/chai!should' {
	function should(): void;
	export = should;
}

declare module 'intern/dojo/has' {
	function has(name: string): any;
	export = has;
}

declare module 'intern/lib/Suite' {
	import Command = require('leadfoot/Command');
	import Promise = require('dojo/Promise');
	import Test = require('intern/lib/Test');

	class Suite {
		constructor(kwArgs?: Suite.KwArgs);

		name: string;

		tests: Array<Test | Suite>;

		parent: Suite;

		setup: () => Promise.Thenable<void> | void;
		beforeEach: () => Promise.Thenable<void> | void;
		afterEach: () => Promise.Thenable<void> | void;
		teardown: () => Promise.Thenable<void> | void;

		error: Error;

		timeElapsed: number;

		/**
		 * A regular expression used to filter, by test ID, which tests are run.
		 */
		grep: RegExp;

		/**
		 * The WebDriver interface for driving a remote environment. This value is only guaranteed to exist from the
		 * setup/beforeEach/afterEach/teardown and test methods, since environments are not instantiated until they are
		 * actually ready to be tested against. This property is only available to functional suites.
		 */
		remote: Command<void>;

		/**
		 * If true, the suite will only publish its start topic after the setup callback has finished,
		 * and will publish its end topic before the teardown callback has finished.
		 */
		publishAfterSetup: boolean;

		/**
		 * The unique identifier of the suite, assuming all combinations of suite + test are unique.
		 */
		id: string;

		/**
		 * The sessionId of the environment in which the suite executed.
		 */
		sessionId: string;

		/**
		 * The total number of tests in this suite and any sub-suites. To get only the number of tests for this suite,
		 * look at `this.tests.length`.
		 *
		 * @readonly
		 */
		numTests: number;

		/**
		 * The total number of tests in this test suite and any sub-suites that have failed.
		 *
		 * @readonly
		 */
		numFailedTests: number;

		/**
		 * The total number of tests in this test suite and any sub-suites that were skipped.
		 *
		 * @readonly
		 */
		numSkippedTests: number;

		/**
		* Runs test suite in order:
		*
		* * setup
		* * for each test:
		*   * beforeEach
		*   * test
		*   * afterEach
		* * teardown
		*
		* If setup, beforeEach, afterEach, or teardown throw, the suite itself will be marked as failed
		* and no further tests in the suite will be executed.
		*
		* @returns {dojo/promise/Promise}
		*/
		run(): Promise<number>;

		toJSON(): Suite.Serialized;
	}

	module Suite {
		export interface KwArgs {
			name: typeof Suite.prototype.name;
			parent: typeof Suite.prototype.parent;
			tests?: typeof Suite.prototype.tests;
			setup?: typeof Suite.prototype.setup;
			beforeEach?: typeof Suite.prototype.setup;
			afterEach?: typeof Suite.prototype.setup;
			teardown?: typeof Suite.prototype.setup;
			grep?: typeof Suite.prototype.grep;
			remote?: typeof Suite.prototype.remote;
		}

		export interface Serialized {
			name: string;
			sessionId: string;
			hasParent: boolean;
			tests: Array<Test.Serialized>;
			timeElapsed: number;
			numTests: number;
			numFailedTests: number;
			numSkippedTests: number;
			error?: {
				name: string;
				message: string;
				stack: string;
				relatedTest: Test;
			}
		}
	}

	export = Suite;
}

declare module 'intern/lib/Test' {
	import Command = require('leadfoot/Command');
	import Promise = require('dojo/Promise');
	import Suite = require('intern/lib/Suite');

	class Test {
		constructor(kwArgs?: Test.KwArgs);

		name: string;
		test: () => any;
		parent: Suite;
		timeout: number;
		isAsync: boolean;
		timeElapsed: number;
		hasPassed: boolean;
		skipped: string;
		error: Error;

		/**
		 * The unique identifier of the test, assuming all combinations of suite + test are unique.
		 *
		 * @readonly
		 */
		id: string;

		/**
		 * The WebDriver interface for driving a remote environment.
		 *
		 * @see module:intern/lib/Suite#remote
		 * @readonly
		 */
		remote: Command<void>;

		sessionId: string;

		/**
		 * A convenience function that generates and returns a special Deferred that can be used for asynchronous
		 * testing.
		 * Once called, a test is assumed to be asynchronous no matter its return value (the generated Deferred's
		 * promise will always be used as the implied return value if a promise is not returned by the test function).
		 *
		 * @param timeout
		 * If provided, the amount of time to wait before rejecting the test with a timeout error, in milliseconds.
		 *
		 * @param numCallsUntilResolution
		 * The number of times that resolve needs to be called before the Deferred is actually resolved.
		 */
		async(timeout?: number, numCallsUntilResolution?: number): Test.Deferred<void>;

		/**
		 * Runs the test.
		 */
		run(): Promise<void>;

		/**
		 * Skips this test.
		 *
		 * @param message
		 * If provided, will be stored in this test's `skipped` property.
		 */
		skip(message?: string): void;

		toJSON(): Test.Serialized;
	}

	module Test {
		export interface Deferred<T> extends Promise.Deferred<T> {
			callback<U extends Function>(callback: U): U;
			rejectOnError<U extends Function>(callback: U): U;
		}

		export interface KwArgs {
			name: typeof Test.prototype.name;
		}

		export interface Serialized {
			name: string;
			sessionId: string;
			id: string;
			timeout: number;
			timeElapsed: number;
			hasPassed: number;
			skipped: string;
			error: {
				name: string;
				message: string;
				stack: string;
			}
		}
	}

	export = Test;
}
