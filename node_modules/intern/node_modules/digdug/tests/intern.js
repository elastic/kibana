/* jshint dojo:true */
define({
	proxyPort: 9000,
	proxyUrl: 'http://localhost:9000/',
	maxConcurrency: 3,
	loader: {
		packages: [
			{ name: 'digdug', location: '.' }
		]
	},
	reporters: [ 'console' ],
	suites: [
		'dojo/has!host-node?digdug/tests/all'
	],
	functionalSuites: [],
	excludeInstrumentation: /^(?:tests|node_modules)\//
});
