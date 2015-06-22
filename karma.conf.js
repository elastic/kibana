// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function (config) {
    config.set({
        // base path, that will be used to resolve files and exclude
        basePath: 'app/',

        // testing framework to use (jasmine/mocha/qunit/...)
        frameworks: ['jasmine', "requirejs"],

        // list of files / patterns to load in the browser
        files: [
            {pattern: 'bower_components/angular/angular.min.js', included: true },
            {pattern: 'bower_components/angular-mocks/angular-mocks.js', included: false },
            {pattern: 'bower_components/angular-resource/angular-resource.js', included: false },
            {pattern: 'bower_components/angular-cookies/angular-cookies.js', included: false },
            {pattern: 'bower_components/angular-sanitize/angular-sanitize.js', included: false },
            {pattern: 'bower_components/angular-ui-router/release/angular-ui-router.js', included: false },
            {pattern: 'bower_components/angular-animate/angular-animate.js', included: false },
            {pattern: 'bower_components/angular-strap/dist/angular-strap.min.js', included: false },
            {pattern: 'bower_components/angular-strap/dist/angular-strap.tpl.min.js', included: false },
            {pattern: 'scripts/**/*.html', included: false },
            {pattern: 'scripts/**/*.js', included: false },
            {pattern: 'scripts/**/*.spec.js', included: false },
            // http://karma-runner.github.io/0.10/plus/requirejs.html
            '../test.js'
        ],

        // list of files / patterns to exclude
        exclude: [],

        // web server port
        port: 8080,

        // level of logging
        // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: ['PhantomJS'],

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: false
    });
};
