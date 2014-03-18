module.exports = function(config) {
    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: '',

        frameworks: ['jasmine'],

        // list of files/patterns to load in the browser
        files: [
            //{pattern: 'lib/**/*.js', included: false},
            {pattern: 'lib/d3/*.js', included: true},
            {pattern: 'src/**/*.js', included: true},
            {pattern: 'test/*Spec.js', included: true},
            {pattern: 'test/**/*Spec.js', included: true}
        ],

        // list of files to exclude
        exclude: [],

        preprocessors: {},

        // use dots reporter, as travis terminal does not support esapping sequences
        // possible values: 'dots', 'progress'
        // CLI --reporters progress
        reporters: ['progress'],

        junitReporter: {
            // will be resolved to basePath (in the same way as files/exclude patterns)
            outputFile: 'test-results.xml'
        },

        // web server port
        // CLI --port 9876
        port: 9876,

        // enable/disable colors in the output (reporters and logs)
        // CLI --colors --no-colors
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        // CLI --log-level debug
        logLevel: config.LOG_DEBUG,

        // enable/disable watching file and executing tests whenever any file changes
        // CLI --auto-watch --no-auto-watch
        autoWatch: true,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera (has to be installed with `npm install karma-opera-launcher --save-dev`)
        // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher --save-dev`)
        // - PhantomJS
        // - IE (only Windows; has to be installed with `npm install karma-ie-launcher --save-dev`)
        // CLI --browsers Chrome,Firefox,Safari
        browsers: ['chrome_without_security'],

        customLaunchers: {
            chrome_without_security: {
                base: 'Chrome',
                flags: ['--disable-web-security']
            }
        },

        // If browser does not capture in given timeout [ms], kill it
        // CLI --capture-timeout 5000
        captureTimeout: 20000,

        // Auto run tests on start (when browsers are captured) and exit
        // CLI --single-run --no-single-run
        singleRun: false,

        // report which specs are slower than 500ms
        // CLI --report-slower-than 500
        reportSlowerThan: 500,

        plugins: [
            'karma-jasmine',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-safari-launcher',
            'karma-junit-reporter',
            'karma-commonjs'
        ]
    });
};