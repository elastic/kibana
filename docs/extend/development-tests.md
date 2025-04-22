---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-tests.html
---

# Testing [development-tests]


### Running specific {{kib}} tests [_running_specific_kib_tests]

The following table outlines possible test file locations and how to invoke them:

| Test runner | Test location | Runner command (working directory is {{kib}} root) |
| --- | --- | --- |
| Jest | `**/*.test.{js,mjs,ts,tsx}` | `yarn test:jest [test path]` |
| Jest (integration) | `**/integration_tests/**/*.test.{js,mjs,ts,tsx}` | `yarn test:jest_integration [test path]` |
| Functional | `test/**/config.js` `x-pack/test/**/config.js` | `node scripts/functional_tests_server --config [directory]/config.js` `node scripts/functional_test_runner --config [directory]/config.js --grep=regexp` |

Test runner arguments: - Where applicable, the optional arguments `--grep=regexp` will only run tests or test suites whose descriptions matches the regular expression. - `[test path]` is the relative path to the test file.

## Unit Testing [_unit_testing]

Kibana primarily uses Jest for unit testing. Each plugin or package defines a `jest.config.js` that extends [a preset](https://github.com/elastic/kibana/tree/master/packages/kbn-test/jest-preset.js) provided by the [`@kbn/test`](https://github.com/elastic/kibana/tree/master/packages/kbn-test) package. Unless you intend to run all unit tests within the project, it’s most efficient to provide the Jest configuration file for the plugin or package you’re testing.

```bash
yarn jest --config src/platform/plugins/shared/dashboard/jest.config.js
```

A script is available to provide a better user experience when testing while navigating throughout the repository. To run the tests within your current working directory, use `yarn test:jest`. Like the Jest CLI, you can also supply a path to determine which tests to run.

```bash
kibana/src/platform/plugins/shared/dashboard/server$ yarn test:jest #or
kibana/src/platform/plugins/shared/dashboard$ yarn test:jest server #or
kibana$ yarn test:jest src/platform/plugins/shared/dashboard/server
```

Any additional options supplied to `test:jest` will be passed onto the Jest CLI with the resulting Jest command always being outputted.

```bash
kibana/src/platform/plugins/shared/dashboard/server$ yarn test:jest --coverage

# is equivalent to

yarn jest --coverage --verbose --config /home/tyler/elastic/kibana/src/platform/plugins/shared/dashboard/jest.config.js server
```

You can generate code coverage report for a single plugin.

```bash
yarn jest --coverage --config src/platform/plugins/shared/console/jest.config.js
```

Html report is available in target/kibana-coverage/jest/path/to/plugin


### Running browser automation tests [_running_browser_automation_tests]

Check out [Functional Testing](#development-functional-tests) to learn more about how you can run and develop functional tests for {{kib}} core and plugins.

You can also look into the [Scripts README.md](https://github.com/elastic/kibana/tree/master/scripts/README.md) to learn more about using the node scripts we provide for building {{kib}}, running integration tests, and starting up {{kib}} and {{es}} while you develop.


#### More testing information: [_more_testing_information]

* [Functional Testing](#development-functional-tests)
* [Unit testing frameworks](#development-unit-tests)
* [Automated Accessibility Testing](#development-accessibility-tests)
* [Package Testing](#development-package-tests)


## Functional Testing [development-functional-tests]

We use functional tests to make sure the {{kib}} UI works as expected. It replaces hours of manual testing by automating user interaction. To have better control over our functional test environment, and to make it more accessible to plugin authors, {{kib}} uses a tool called the `FunctionalTestRunner`.


#### Running functional tests [_running_functional_tests]

The `FunctionalTestRunner` (FTR) is very bare bones and gets most of its functionality from its config file. The {{kib}} repo contains many FTR config files which use slightly different configurations for the {{kib}} server or {{es}}, have different test files, and potentially other config differences. FTR config files are organised in manifest files, based on testing area and type of distribution:

- serverless:
  - `ftr_base_serverless_configs.yml`
  - `ftr_oblt_serverless_configs.yml`
  - `ftr_security_serverless_configs.yml`
  - `ftr_search_serverless_configs.yml`
- stateful:
  - `ftr_platform_stateful_configs.yml`
  - `ftr_oblt_stateful_configs.yml`
  - `ftr_security_stateful_configs.yml`
  - `ftr_search_stateful_configs.yml`

If you’re writing a plugin outside the {{kib}} repo, you will have your own config file. See [Functional Tests for Plugins outside the {{kib}} repo](/extend/external-plugin-functional-tests.md) for more info.

There are three ways to run the tests depending on your goals:

1. Easiest option:

    * Description: Starts up {{kib}} & {{es}} servers, followed by running tests. This is much slower when running the tests multiple times because slow startup time for the servers. Recommended for single-runs.
    * `node scripts/functional_tests`

        * does everything in a single command, including running {{es}} and {{kib}} locally
        * tears down everything after the tests run
        * exit code reports success/failure of the tests

2. Best for development:

    * Description: Two commands, run in separate terminals, separate the components that are long-running and slow from those that are ephemeral and fast. Tests can be re-run much faster, and this still runs {{es}} & {{kib}} locally.
    * `node scripts/functional_tests_server`

        * starts {{es}} and {{kib}} servers
        * slow to start
        * can be reused for multiple executions of the tests, thereby saving some time when re-running tests
        * automatically restarts the {{kib}} server when relevant changes are detected

    * `node scripts/functional_test_runner`

        * runs the tests against {{kib}} & {{es}} servers that were started by `node scripts/functional_tests_server`
        * exit code reports success or failure of the tests

3. Custom option:

    * Description: Runs tests against instances of {{es}} & {{kib}} started some other way (like Elastic Cloud, or an instance you are managing in some other way).
    * Just executes the functional tests
    * URL, credentials, etc. for {{es}} and {{kib}} are specified via environment variables
    * When running against an Elastic Cloud instance, additional environment variables are required `TEST_CLOUD` and `ES_SECURITY_ENABLED`
    * You must run the same branch of tests as the version of {{kib}} you’re testing.  To run against a previous minor version use option `--es-version <instance version>`
    * To run a specific configuration use option `--config <configuration file>`
    * Here’s an example that runs against an Elastic Cloud instance

        ```shell
        export TEST_KIBANA_URL=https://elastic:password@my-kbn-cluster.elastic-cloud.com:443
        export TEST_ES_URL=https://elastic:password@my-es-cluster.elastic-cloud.com:443

        export TEST_CLOUD=1
        export ES_SECURITY_ENABLED=1

        node scripts/functional_test_runner [--config <config>] [--es-version <instance version>]
        ```

    * Or you can override any or all of these individual parts of the URL and leave the others to the default values.

        ```shell
        export TEST_KIBANA_PROTOCOL=https
        export TEST_KIBANA_HOSTNAME=my-kibana-instance.internal.net
        export TEST_KIBANA_PORT=443
        export TEST_KIBANA_USER=kibana
        export TEST_KIBANA_PASS=<password>

        export TEST_ES_PROTOCOL=http
        export TEST_ES_HOSTNAME=my-es-cluster.internal.net
        export TEST_ES_PORT=9200
        export TEST_ES_USER=elastic
        export TEST_ES_PASS=<password>
        node scripts/functional_test_runner
        ```

    * Selenium tests are run in headless mode on CI. Locally the same tests will be executed in a real browser. You can activate headless mode by setting the environment variable:

        ```shell
        export TEST_BROWSER_HEADLESS=1
        ```

    * If you are using Google Chrome, you can slow down the local network connection to verify test stability:

        ```shell
        export TEST_THROTTLE_NETWORK=1
        ```

    * When running against a Cloud deployment, some tests are not applicable. To skip tests that do not apply, use --exclude-tag.

        ```shell
        node scripts/functional_test_runner --exclude-tag skipCloud
        node scripts/functional_test_runner --exclude-tag skipMKI
        ```



##### More about `node scripts/functional_test_runner` [_more_about_node_scriptsfunctional_test_runner]

When run without any arguments the `FunctionalTestRunner` automatically loads the configuration in the standard location, but you can override that behavior with the `--config` flag. List configs with multiple --config arguments.

* `--config test/functional/apps/app-name/config.js` starts {{es}} and {{kib}} servers with the WebDriver tests configured to run in Chrome for a specific app. For example, `--config test/functional/apps/home/config.js` starts {{es}} and {{kib}} servers with the WebDriver tests configured to run in Chrome for the home app.
* `--config test/functional/config.firefox.js` starts {{es}} and {{kib}} servers with the WebDriver tests configured to run in Firefox.
* `--config test/api_integration/config.js` starts {{es}} and {{kib}} servers with the api integration tests configuration.
* `--config test/accessibility/config.ts` starts {{es}} and {{kib}} servers with the WebDriver tests configured to run an accessibility audit using [axe](https://www.deque.com/axe/).

There are also command line flags for `--bail` and `--grep`, which behave just like their mocha counterparts. For instance, use `--grep=foo` to run only tests that match a regular expression.

Logging can also be customized with `--quiet`, `--debug`, or `--verbose` flags.

There are also options like `--include` to run only the tests defined in a single file or set of files.

Run `node scripts/functional_test_runner --help` to see all available options.


#### Writing functional tests [_writing_functional_tests]


##### Environment [_environment]

The tests are written in [mocha](https://mochajs.org) using [@kbn/expect](https://github.com/elastic/kibana/tree/main/packages/kbn-expect) for assertions.

We use [WebDriver Protocol](https://www.w3.org/TR/webdriver1/) to run tests in both Chrome and Firefox with the help of [chromedriver](https://sites.google.com/a/chromium.org/chromedriver/) and [geckodriver](https://firefox-source-docs.mozilla.org/testing/geckodriver/). When the `FunctionalTestRunner` launches, remote service creates a new webdriver session, which starts the driver and a stripped-down browser instance. We use `browser` service and `webElementWrapper` class to wrap up [Webdriver API](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/).

The `FunctionalTestRunner` automatically transpiles functional tests using babel, so that tests can use the same ECMAScript features that {{kib}} source code uses. See [STYLEGUIDE.mdx](https://github.com/elastic/kibana/blob/current//STYLEGUIDE.mdx).


##### Definitions [_definitions]

**Provider:**

Code run by the `FunctionalTestRunner` is wrapped in a function so it can be passed around via config files and be parameterized. Any of these Provider functions may be asynchronous and should return/resolve-to the value they are meant to *provide*. Provider functions will always be called with a single argument: a provider API (see the [Provider API Section](#functional_test_runner_provider_api)).

A config provider:

```js
// config and test files use `export default`
export default function (/* { providerAPI } */) {
  return {
    // ...
  }
}
```

**Service**
:   A Service is a named singleton created using a subclass of `FtrService`. Tests and other services can retrieve service instances by asking for them by name. All functionality except the mocha API is exposed via services. When you write your own functional tests check for existing services that help with the interactions you’re looking to execute, and add new services for interactions which aren’t already encoded in a service.

**Service Providers**
:   For legacy purposes, and for when creating a subclass of `FtrService` is inconvenient, you can also create services using a "Service Provider". These are functions which  which create service instances and return them. These instances are cached and provided to tests. Currently these providers may also return a Promise for the service instance, allowing the service to do some setup work before tests run. We expect to fully deprecate and remove support for async service providers in the near future and instead require that services use the `lifecycle` service to run setup before tests. Providers which return instances of classes other than `FtrService` will likely remain supported for as long as possible.

**Page objects**
:   Page objects are functionally equivalent to services, except they are loaded with a slightly different mechanism and generally defined separate from services. When you write your own functional tests you might want to write some of your services as Page objects, but it is not required.

**Test Files**
:   The `FunctionalTestRunner`'s primary purpose is to execute test files. These files export a Test Provider that is called with a Provider API but is not expected to return a value. Instead Test Providers define a suite using [mocha’s BDD interface](https://mochajs.org/#bdd).

**Test Suite**
:   A test suite is a collection of tests defined by calling `describe()`, and then populated with tests and setup/teardown hooks by calling `it()`, `before()`, `beforeEach()`, etc. Every test file must define only one top level test suite, and test suites can have as many nested test suites as they like.

**Tags**
:   Use tags in `describe()` function to group functional tests. Tags include:

    * `ciGroup{{id}}` - Assigns test suite to a specific CI worker
    * `skipCloud` and `skipFirefox` - Excludes test suite from running on Cloud or Firefox
    * `includeFirefox` - Groups tests that run on Chrome and Firefox


**Cross-browser testing**
:   On CI, all the functional tests are executed in Chrome by default. To also run a suite against Firefox, assign the `includeFirefox` tag:

```js
// on CI test suite will be run twice: in Chrome and Firefox
describe('My Cross-browser Test Suite', function () {
  this.tags('includeFirefox');

  it('My First Test');
}
```

If the tests do not apply to Firefox, assign the `skipFirefox` tag.

To run tests on Firefox locally, use `config.firefox.js`:

```shell
node scripts/functional_test_runner --config test/functional/config.firefox.js
```


##### Using the test_user service [_using_the_test_user_service]

Tests should run at the positive security boundary condition, meaning that they should be run with the minimum privileges required (and documented) and not as the superuser. This prevents the type of regression where additional privileges accidentally become required to perform the same action.

The functional UI tests now default to logging in with a user named `test_user` and the roles of this user can be changed dynamically without logging in and out.

In order to achieve this a new service was introduced called `createTestUserService` (see `packages/kbn-ftr-common-functional-ui-services/services/security/test_user.ts`). The purpose of this test user service is to create roles defined in the test config files and setRoles() or restoreDefaults().

An example of how to set the role like how its defined below:

`await security.testUser.setRoles(['kibana_user', 'kibana_date_nanos']);`

Here we are setting the `test_user` to have the `kibana_user` role and also role access to a specific data index (`kibana_date_nanos`).

Tests should normally setRoles() in the before() and restoreDefaults() in the after().


##### Anatomy of a test file [_anatomy_of_a_test_file]

This annotated example file shows the basic structure every test suite uses. It starts by importing [`@kbn/expect`](https://github.com/elastic/kibana/tree/main/packages/kbn-expect) and defining its default export: an anonymous Test Provider. The test provider then destructures the Provider API for the `getService()` and `getPageObjects()` functions. It uses these functions to collect the dependencies of this suite. The rest of the test file will look pretty normal to mocha.js users. `describe()`, `it()`, `before()` and the lot are used to define suites that happen to automate a browser via services and objects of type `PageObject`.

```js
import expect from '@kbn/expect';
// test files must `export default` a function that defines a test suite
export default function ({ getService, getPageObject }) {

  // most test files will start off by loading some services
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  // for historical reasons, PageObjects are loaded in a single API call
  // and returned on an object with a key/value for each requested PageObject
  const PageObjects = getPageObjects(['common', 'visualize']);

  // every file must define a top-level suite before defining hooks/tests
  describe('My Test Suite', () => {

    // most suites start with a before hook that navigates to a specific
    // app/page and restores some archives into Elasticsearch with esArchiver
    before(async () => {
      await Promise.all([
        // start by clearing Saved Objects from the .kibana index
        await kibanaServer.savedObjects.cleanStandardList();
        // load some basic log data only if the index doesn't exist
        esArchiver.loadIfNeeded('src/platform/test/functional/fixtures/es_archiver/makelogs')
      ]);
      // go to the page described by `apps.visualize` in the config
      await PageObjects.common.navigateTo('visualize');
    });

    // right after the before() hook definition, add the teardown steps
    // that will tidy up Elasticsearch for other test suites
    after(async () => {
      // we clear Kibana Saved Objects but not the makelogs
      // archive because we don't make any changes to it, and subsequent
      // suites could use it if they call `.loadIfNeeded()`.
      await kibanaServer.savedObjects.cleanStandardList();
    });

    // This series of tests illustrate how tests generally verify
    // one step of a larger process and then move on to the next in
    // a new test, each step building on top of the previous
    it('Vis Listing Page is empty');
    it('Create a new vis');
    it('Shows new vis in listing page');
    it('Opens the saved vis');
    it('Respects time filter changes');
    it(...
  });

}
```


#### Provider API [functional_test_runner_provider_api]

The first and only argument to all providers is a Provider API Object. This object can be used to load service/page objects and config/test files.

Within config files the API has the following properties

`log`
:   An instance of the `ToolingLog` that is ready for use

`readConfigFile(path)`
:   Returns a promise that will resolve to a Config instance that provides the values from the config file at `path`

Within service and PageObject Providers the API is:

`getService(name)`
:   Load and return the singleton instance of a service by name

`getPageObjects(names)`
:   Load the singleton instances of `PageObject`s and collect them on an object where each name is the key to the singleton instance of that PageObject

Within a test Provider the API is exactly the same as the service providers API but with an additional method:

`loadTestFile(path)`
:   Load the test file at path in place. Use this method to nest suites from other files into a higher-level suite


#### Service Index [_service_index]


##### Built-in Services [_built_in_services]

The `FunctionalTestRunner` comes with three built-in services:

**config:**
:   * Use `config.get(path)` to read any value from the config file


**log:**
:   * `ToolingLog` instances are readable streams. The instance provided by this service is automatically piped to stdout by the `FunctionalTestRunner` CLI
* `log.verbose()`, `log.debug()`, `log.info()`, `log.warning()` all work just like console.log but produce more organized output


**lifecycle:**
:   * Designed primary for use in services
* Exposes lifecycle events for basic coordination. Handlers can return a promise and resolve/fail asynchronously
* Phases include: `beforeLoadTests`, `beforeTests`, `beforeEachTest`, `cleanup`



##### {{kib}} Services [_kib_services]

The {{kib}} functional tests define the vast majority of the actual functionality used by tests.

**browser**
:   * Higher level wrapper for `remote` service, which exposes available browser actions
* Popular methods:

    * `browser.getWindowSize()`
    * `browser.refresh()`



**testSubjects:**
:   * Test subjects are elements that are tagged specifically for selecting from tests
* Use `testSubjects` over CSS selectors when possible
* Usage:

    * Tag your test subject with a `data-test-subj` attribute:

        ```html
        <div id="container”>
          <button id="clickMe” data-test-subj=”containerButton” />
        </div>
        ```

    * Click this button using the `testSubjects` helper:

        ```js
        await testSubjects.click(‘containerButton’);
        ```

* Popular methods:

    * `testSubjects.find(testSubjectSelector)` - Find a test subject in the page; throw if it can’t be found after some time
    * `testSubjects.click(testSubjectSelector)` - Click a test subject in the page; throw if it can’t be found after some time



**find:**
:   * Helpers for `remote.findBy*` methods that log and manage timeouts
* Popular methods:

    * `find.byCssSelector()`
    * `find.allByCssSelector()`



**retry:**
:   * Helpers for retrying operations
* Popular methods:

    * `retry.try(fn, onFailureBlock)` - Execute `fn` in a loop until it succeeds or the default timeout elapses. The optional `onFailureBlock` is executed before each retry attempt.
    * `retry.tryForTime(ms, fn, onFailureBlock)` - Execute `fn` in a loop until it succeeds or `ms` milliseconds elapses. The optional `onFailureBlock` is executed before each retry attempt.



**kibanaServer:**
:   * Helpers for interacting with {{kib}}'s server
* Commonly used methods:

    * `kibanaServer.uiSettings.update()`
    * `kibanaServer.version.get()`
    * `kibanaServer.status.getOverallState()`



**esArchiver:**
:   * Load/unload archives created with the `esArchiver`
* Popular methods:

    * `esArchiver.load(path)`
    * `esArchiver.loadIfNeeded(path)`
    * `esArchiver.unload(path)`



Full list of services that are used in functional tests can be found here: [test/functional/services](https://github.com/elastic/kibana/blob/current/test/functional/services)

**Low-level utilities:**
:   * es

    * {{es}} client
    * Higher level options: `kibanaServer.uiSettings` or `esArchiver`

* remote

    * Instance of [WebDriver](https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.md) class
    * Responsible for all communication with the browser
    * To perform browser actions, use `remote` service
    * For searching and manipulating with DOM elements, use `testSubjects` and `find` services
    * See the [selenium-webdriver docs](https://seleniumhq.github.io/selenium/docs/api/javascript/) for the full API.




##### Custom Services [_custom_services]

Services are intentionally generic. They can be literally anything (even nothing). Some services have helpers for interacting with a specific types of UI elements, like `pointSeriesVis`, and others are more foundational, like `log` or `config`. Whenever you want to provide some functionality in a reusable package, consider making a custom service.

To create a custom service `somethingUseful`:

* Create a `test/functional/services/something_useful.js` file that looks like this:

    ```js
    // Services are defined by Provider functions that receive the ServiceProviderAPI
    export function SomethingUsefulProvider({ getService }) {
      const log = getService('log');

      class SomethingUseful {
        doSomething() {
        }
      }
      return new SomethingUseful();
    }
    ```

* Re-export your provider from `services/index.js`
* Import it into `src/functional/config.base.js` and add it to the services config:

    ```js
    import { SomethingUsefulProvider } from './services';

    export default function () {
      return {
        // … truncated ...
        services: {
          somethingUseful: SomethingUsefulProvider
        }
      }
    }
    ```



#### PageObjects [_pageobjects]

The purpose for each PageObject is pretty self-explanatory. The visualize PageObject provides helpers for interacting with the visualize app, dashboard is the same for the dashboard app, and so on.

One exception is the "common" PageObject. A holdover from the intern implementation, the common PageObject is a collection of helpers useful across pages. Now that we have shareable services, and those services can be shared with other `FunctionalTestRunner` configurations, we will continue to move functionality out of the common PageObject and into services.

Please add new methods to existing or new services rather than further expanding the CommonPage class.


#### Gotchas [_gotchas]

Remember that you can’t run an individual test in the file (`it` block) because the whole `describe` needs to be run in order. There should only be one top level `describe` in a file.


##### Functional Test Timing [_functional_test_timing]

Another important gotcha is writing stable tests by being mindful of timing. All methods on `remote` run asynchronously. It’s better to write interactions that wait for changes on the UI to appear before moving onto the next step.

For example, rather than writing an interaction that simply clicks a button, write an interaction with the a higher-level purpose in mind:

Bad example: `PageObjects.app.clickButton()`

```js
class AppPage {
  // what can people who call this method expect from the
  // UI after the promise resolves? Since the reaction to most
  // clicks is asynchronous the behavior is dependent on timing
  // and likely to cause test that fail unexpectedly
  async clickButton () {
    await testSubjects.click(‘menuButton’);
  }
}
```

Good example: `PageObjects.app.openMenu()`

```js
class AppPage {
  // unlike `clickButton()`, callers of `openMenu()` know
  // the state that the UI will be in before they move on to
  // the next step
  async openMenu () {
    await testSubjects.click(‘menuButton’);
    await testSubjects.exists(‘menu’);
  }
}
```

Writing in this way will ensure your test timings are not flaky or based on assumptions about UI updates after interactions.


#### Debugging [_debugging]

From the command line run:

```shell
node --inspect-brk scripts/functional_test_runner
```

This prints out a URL that you can visit in Chrome and debug your functional tests in the browser.

You can also see additional logs in the terminal by running the `FunctionalTestRunner` with the `--debug` or `--verbose` flag. Add more logs with statements in your tests like

```js
// load the log service
const log = getService(‘log’);

// log.debug only writes when using the `--debug` or `--verbose` flag.
log.debug(‘done clicking menu’);
```


#### MacOS testing performance tip [_macos_testing_performance_tip]

macOS users on a machine with a discrete graphics card may see significant speedups (up to 2x) when running tests by changing your terminal emulator’s GPU settings. In iTerm2:
* Open Preferences (Command + ,)
* In the General tab, under the "Magic" section, ensure "GPU rendering" is checked
* Open "Advanced GPU Settings…​"
* Uncheck the "Prefer integrated to discrete GPU" option
* Restart iTerm


### Flaky Test Runner [_flaky_test_runner]

If your functional tests are flaky then the Operations team might skip them and ask that you make them less flaky before enabling them once again. This process usually involves looking at the failures which are logged on the relevant Github issue and finding incorrect assumptions or conditions which need to be awaited at some point in the test. To determine if your changes make the test fail less often you can run your tests in the Flaky Test Runner. This tool runs up to 500 executions of a specific ciGroup. To start a build of the Flaky Test Runner create a PR with your changes and then visit [https://ci-stats.kibana.dev/trigger_flaky_test_runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner), select your PR, choose the CI Group that your tests are in, and trigger the build.

This will take you to Buildkite where your build will run and tell you if it failed in any execution.

A flaky test may only fail once in 1000 runs, so keep this in mind and make sure you use enough executions to really prove that a test isn’t flaky anymore.


## Unit testing frameworks [development-unit-tests]

{{kib}} is doing unit testing doing `Jest`.


### Jest [_jest]

Jest tests are stored in the same directory as source code files with the `.test.{js,mjs,ts,tsx}` suffix.

Each plugin and package contains it’s own `jest.config.js` file to define its root, and any overrides to the jest-preset provided by `@kbn/test`. When working on a single plugin or package, you will find it’s more efficient to supply the Jest configuration file when running.

```shell
yarn jest --config src/platform/plugins/shared/discover/jest.config.js
```


##### Writing Jest Unit Tests [_writing_jest_unit_tests]

In order to write those tests there are two main things you need to be aware of. The first one is the different between `jest.mock` and `jest.doMock` and the second one our `jest mocks file pattern`. As we are running `js` and `ts` test files with `babel-jest` both techniques are needed specially for the tests implemented on Typescript in order to benefit from the auto-inference types feature.


##### Jest.mock vs Jest.doMock [_jest_mock_vs_jest_domock]

Both methods are essentially the same on their roots however the `jest.mock` calls will get hoisted to the top of the file and can only reference variables prefixed with `mock`. On the other hand, `jest.doMock` won’t be hoisted and can reference pretty much any variable we want, however we have to assure those referenced variables are instantiated at the time we need them which lead us to the next section where we’ll talk about our jest mock files pattern.


##### Jest Mock Files Pattern [_jest_mock_files_pattern]

Specially on typescript it is pretty common to have in unit tests `jest.doMock` calls which reference for example imported types. Any error will thrown from doing that however the test will fail. The reason behind that is because despite the `jest.doMock` isn’t being hoisted by `babel-jest` the import with the types we are referencing will be hoisted to the top and at the time we’ll call the function that variable would not be defined.

In order to prevent that we develop a protocol that should be followed:

* Each module could provide a standard mock in `mymodule.mock.ts` in case there are other tests that could benefit from using definitions here. This file would not have any `jest.mock` calls, just dummy objects.
* Each test defines its mocks in `mymodule.test.mocks.ts`. This file could import relevant mocks from the generalised module’s mocks file `(*.mock.ts)` and call `jest.mock` for each of them. If there is any relevant dummy mock objects to generalise (and to be used by other tests), the dummy objects could be defined directly on this file.
* Each test would import its mocks from the test mocks file mymodule.test.mocks.ts. `mymodule.test.ts` has an import like: `import * as Mocks from './mymodule.test.mocks'`, `import { mockX } from './mymodule.test.mocks'` or just `import './mymodule.test.mocks'` if there isn’t anything exported to be used.


#### Debugging Unit Tests [debugging-unit-tests]

The standard `yarn test` task runs several sub tasks and can take several minutes to complete, making debugging failures pretty painful. In order to ease the pain specialized tasks provide alternate methods for running the tests.

You could also add the `--debug` option so that `node` is run using the `--inspect-brk` flag. You’ll need to connect a remote debugger such as [`node-inspector`](https://github.com/node-inspector/node-inspector) to proceed in this mode.


#### Unit Testing Plugins [_unit_testing_plugins]

Even when using [Kibana plugin generator](https://github.com/elastic/kibana/tree/main/packages/kbn-plugin-generator) we do not enforce a way for unit testing your plugin. Please setup and you use the tools of your choice. If the plugin will live inside the Kibana repo `Jest` must be used.


## Automated Accessibility Testing [development-accessibility-tests]

To write an accessibility test, use the provided accessibility service `getService('a11y')`. Accessibility tests are fairly straightforward to write as [axe](https://github.com/dequelabs/axe-core) does most of the heavy lifting. Navigate to the UI that you need to test, then call `testAppSnapshot();` from the service imported earlier to make sure axe finds no failures. Navigate through every portion of the UI for the best coverage.

An example test might look like this:

```js
export default function ({ getService, getPageObjects }) {
  const { common, home } = getPageObjects(['common', 'home']);
  const a11y = getService('a11y'); /* this is the wrapping service around axe */

  describe('Kibana Home', () => {
    before(async () => {
      await common.navigateToApp('home'); /* navigates to the page we want to test */
    });

    it('Kibana Home view', async () => {
      await retry.waitFor(
        'home page visible',
        async () => await testSubjects.exists('homeApp')
      ); /* confirm you're on the correct page and that it's loaded */
      await a11y.testAppSnapshot(); /* this expects that there are no failures found by axe */
    });

    /**
     * If these tests were added by our QA team, tests that fail that require significant app code
     * changes to be fixed will be skipped with a corresponding issue label with more info
     */
    // Skipped due to https://github.com/elastic/kibana/issues/99999
    it.skip('all plugins view page meets a11y requirements', async () => {
      await home.clickAllKibanaPlugins();
      await a11y.testAppSnapshot();
    });

    /**
     * Testing all the versions and different views of of a page is important to get good
     * coverage. Things like empty states, different license levels, different permissions, and
     * loaded data can all significantly change the UI which necessitates their own test.
     */
    it('Add Kibana sample data page', async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await a11y.testAppSnapshot();
    });
  });
}
```

### Running tests [_running_tests]

To run the tests locally:

1. In one terminal window run:

    ```shell
    node scripts/functional_tests_server --config test/accessibility/config.ts
    ```

2. When the server prints that it is ready, in another terminal window run:

    ```shell
    node scripts/functional_test_runner.js --config test/accessibility/config.ts
    ```


To run the x-pack tests, swap the config file out for `x-pack/test/accessibility/apps/{group1,group2,group3}/config.ts`.

The testing is done using [axe](https://github.com/dequelabs/axe-core). You can run the same thing that runs CI using browser plugins:

* [Chrome](https://chrome.google.com/webstore/detail/axe-web-accessibility-tes/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US)
* [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)


### Anatomy of a failure [_anatomy_of_a_failure]

Failures can seem confusing if you’ve never seen one before. Here is a breakdown of what a failure coming from CI might look like:

```bash
1)    Dashboard
       create dashboard button:

      Error: a11y report:

 VIOLATION
   [aria-hidden-focus]: Ensures aria-hidden elements do not contain focusable elements
     Help: https://dequeuniversity.com/rules/axe/3.5/aria-hidden-focus?application=axeAPI
     Elements:
       - <span aria-hidden="true"><button type="button">Submit</button></span>
       at Accessibility.testAxeReport (test/accessibility/services/a11y/a11y.ts:90:15)
       at Accessibility.testAppSnapshot (test/accessibility/services/a11y/a11y.ts:58:18)
       at process._tickCallback (internal/process/next_tick.js:68:7)
```

* "Dashboard" and "create dashboard button" are the names of the test suite and specific test that failed.
* Always in brackets, "[aria-hidden-focus]" is the name of the axe rule that failed, followed by a short description.
* "Help: <url>" links to the axe documentation for that rule, including severity, remediation tips, and good and bad code examples.
* "Elements:"  points to where in the DOM the failure originated (using HTML syntax). In this example, the problem came from a span with the `aria-hidden="true"` attribute and a nested `<button>` tag. If the selector is too complicated to find the source of the problem, use the browser plugins mentioned earlier to locate it. If you have a general idea where the issue is coming from, you can also try adding unique IDs to the page to narrow down the location.
* The stack trace points to the internals of axe. The stack trace is there in case the test failure is a bug in axe and not in your code, although this is unlikely.



## Package Testing [development-package-tests]

Packaging tests use Vagrant virtual machines as hosts and Ansible for provisioning and assertions. Kibana distributions are copied from the target folder into each VM and installed, along with required dependencies.

### Setup [_setup]

* [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)

    ```
    # Ubuntu
    sudo apt-get install python3-pip libarchive-tools
    pip3 install --user ansible

    # Darwin
    brew install python3
    pip3 install --user ansible
    ```

* [Vagrant](https://www.vagrantup.com/downloads)
* [Virtualbox](https://www.virtualbox.org/wiki/Downloads)


### Machines [_machines]

| Hostname | IP | Description |
| --- | --- | --- |
| deb | 192.168.56.5 | Installation of Kibana’s deb package |
| rpm | 192.168.56.6 | Installation of Kibana’s rpm package |
| docker | 192.168.56.7 | Installation of Kibana’s docker image |


### Running [_running]

```
# Build distributions
node scripts/build --all-platforms --debug

cd src/platform/test/package

# Setup virtual machine and networking
vagrant up <hostname> --no-provision

# Install Kibana and run OS level tests
# This step can be repeated when adding new tests, it ensures machine state - installations won't run twice
vagrant provision <hostname>

# Running functional tests
node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.56.1 \
  -E discovery.type=single-node \
  --license=trial
TEST_KIBANA_URL=http://elastic:changeme@<ip>:5601 \
TEST_ES_URL=http://elastic:changeme@192.168.56.1:9200 \
  node scripts/functional_test_runner.js --include-tag=smoke
```


### Cleanup [_cleanup]

```
vagrant destroy <hostname>
```

### Cross-browser compatibility [_cross_browser_compatibility]

**Testing IE on OS X**

**Note:** IE11 is not supported from 7.9 onwards.

* [Download VMWare Fusion](http://www.vmware.com/products/fusion/fusion-evaluation.html).
* [Download IE virtual machines](https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/#downloads) for VMWare.
* Open VMWare and go to Window > Virtual Machine Library. Unzip the virtual machine and drag the .vmx file into your Virtual Machine Library.
* Right-click on the virtual machine you just added to your library and select "`Snapshots…`", and then click the "`Take`" button in the modal that opens. You can roll back to this snapshot when the VM expires in 90 days.
* In System Preferences > Sharing, change your computer name to be something simple, e.g. "`computer`".
* Run {{kib}} with `yarn start --host=computer.local` (substituting your computer name).
* Now you can run your VM, open the browser, and navigate to `http://computer.local:5601` to test {{kib}}.
* Alternatively you can use browserstack
