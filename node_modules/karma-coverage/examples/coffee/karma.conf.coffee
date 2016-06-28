module.exports = (config) ->
  config.set
    frameworks: ['mocha']

    files: [
      '*.coffee'
    ]

    browsers: ['Firefox']

    coffeePreprocessor:
      options:
        sourceMap: true

    preprocessors:
      # source files, that you wanna generate coverage for
      # do not include tests or libraries
      # (these files will be instrumented by Istanbul via Ibrik unless
      # specified otherwise in coverageReporter.instrumenter)
      'plus.coffee': 'coverage'

      # note: project files will already be converted to
      # JavaScript via coverage preprocessor.
      # Thus, you'll have to limit the CoffeeScript preprocessor
      # to uncovered files.
      'test.coffee': 'coffee'

    coverageReporter:
      type: 'html'
      instrumenters:
        ibrik : require('ibrik')
      instrumenter:
        '**/*.coffee': 'ibrik'

    # coverage reporter generates the coverage
    reporters: ['dots', 'coverage']

    plugins: [
      require('../../lib/index')
      'karma-mocha'
      'karma-coffee-preprocessor'
      'karma-firefox-launcher'
    ]

    singleRun: true
