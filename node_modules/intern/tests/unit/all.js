define([
	'./main',
	'./order',
	'./lib/EnvironmentType',
	'./lib/Suite',
	'./lib/Test',
	'./lib/util',
	'./lib/ReporterManager',
	'./lib/interfaces/tdd',
	'./lib/interfaces/bdd',
	'./lib/interfaces/object',
	'./lib/interfaces/qunit',
	'./lib/reporters/Console',
	'dojo/has!host-node?./lib/reporters/Pretty',
	'dojo/has!host-node?./lib/reporters/TeamCity',
	'dojo/has!host-node?./lib/reporters/JUnit',
	'dojo/has!host-node?./lib/reporters/Lcov'
], function () {});
