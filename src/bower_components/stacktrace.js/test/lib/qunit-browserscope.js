/*global QUnit */
// global variable - test results for BrowserScope
var _bTestResults = {};
(function() {
    var testKey = 'agt1YS1wcm9maWxlcnINCxIEVGVzdBjr68MRDA';
    var callbackName = "showBrowserScopeResults";

    // Add URL option in QUnit to toggle publishing results to BrowserScope.org
    QUnit.config.urlConfig.push("publish");
    QUnit.config.testTimeout = 1000; // Timeout for async tests

    // Build-up the test results beacon for BrowserScope.org
    QUnit.testDone(function(test) {
        // make sure all assertions passed successfully
        if (!test.failed && test.total === test.passed) {
            _bTestResults[test.name] = 1;
        } else {
            _bTestResults[test.name] = 0;
        }
    });

    // If the user agreed to publish results to BrowserScope.org, go for it!
    QUnit.done(function(result) {
        if (QUnit.config.publish) {
            var newScript = document.createElement('script');
            newScript.src = 'http://www.browserscope.org/user/beacon/' + testKey + "?callback=" + callbackName;
            var firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(newScript, firstScript);
        }
    });

    // Load the results widget from browserscope.org
    window[callbackName] = function() {
        var script = document.createElement('script');
        script.src = "http://www.browserscope.org/user/tests/table/" + testKey + "?o=js";
        document.body.appendChild(script);
    };
}());
