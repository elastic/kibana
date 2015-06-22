(function(window) {

var registerResultListeners = function(model, tc) {
  var totalTests = 0, testsCompleted = 0;

  var createFailedSpecLog = function(spec) {
    var failedStep = findFailedStep(spec.steps);
    var specError = spec.line ? spec.line + ': ' + spec.error.toString() : spec.error.toString();

    return failedStep ? [failedStep.name, specError] : [specError];
  };

  var findFailedStep = function(steps) {
    var stepCount = steps.length;
    for(var i = 0; i < stepCount; i++) {
      var step = steps[i];

      if (step.status === 'failure') {
        return step;
      }
    }

    return null;
  };

  model.on('RunnerBegin', function() {
    totalTests = angular.scenario.Describe.specId;
    tc.info({total: totalTests});
  });

  model.on('SpecEnd', function(spec) {
    var iframe = window.document.getElementsByTagName('iframe')[0];

    // TODO(vojta): create Result type
    var result = {
      id: spec.id,
      description: spec.name,
      suite: [spec.fullDefinitionName],
      success: spec.status === 'success',
      skipped: false,
      time: spec.duration,
      log: [],
      coverage: iframe && iframe.contentWindow.__coverage__
    };

    if (spec.error) {
      result.log = createFailedSpecLog(spec);
    }

    testsCompleted++;
    tc.result(result);
  });

  model.on('RunnerEnd', function() {
    var skippedTests = totalTests - testsCompleted;

    // Inform Karma about number of skipped tests
    // TODO(vojta): report proper suite/description (need to fix the scenario runner first)
    for (var i = 0; i < skippedTests; i++) {
      tc.result({
        id: 'Skipped' + (i + 1),
        description: 'Skipped' + (i + 1),
        suite: [],
        skipped: true,
        time: 0,
        log: []
      });
    }

    tc.complete();
  });
};

/**
 *
 * @param {Object} tc Karma!!
 * @param {Function} scenarioSetupAndRun angular.scenario.setUpAndRun
 * @return {Function}
 */
var createNgScenarioStartFn = function(tc, scenarioSetupAndRun) {
  /**
   * Generates Karma Output
   */
  angular.scenario.output('karma', function(context, runner, model) {
    registerResultListeners(model, tc);
  });

  return function(config) {
    scenarioSetupAndRun({scenario_output: 'karma,html'});
  };
};

window.__karma__.start = createNgScenarioStartFn(window.__karma__, angular.scenario.setUpAndRun);

})(window);
