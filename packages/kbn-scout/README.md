# @kbn/scout

The package is designed to streamline the setup and execution of Playwright tests for Kibana. It consolidates server management and testing capabilities by wrapping both the Kibana/Elasticsearch server launcher and the Playwright test runner. It includes:

    - core test and worker-scoped fixtures for reliable setup across test suites
    - page objects combined into the fixture for for core Kibana apps UI interactions
    - configurations for seamless test execution in both local and CI environments

This package aims to simplify test setup and enhance modularity, making it easier to create, run, and maintain deployment-agnostic tests, that are located in the plugin they actually test.
