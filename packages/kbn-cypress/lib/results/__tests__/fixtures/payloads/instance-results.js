const res = {
  stats: {
    suites: 1,
    tests: 2,
    passes: 1,
    pending: 1,
    skipped: 0,
    failures: 0,
    wallClockStartedAt: "2022-12-11T08:46:31.881Z",
    wallClockEndedAt: "2022-12-11T08:46:50.519Z",
    wallClockDuration: 18638,
  },
  tests: [
    {
      clientId: "r3",
      state: "pending",
      displayError: null,
      attempts: [
        {
          state: "pending",
          error: null,
          timings: null,
          failedFromHookId: null,
          wallClockStartedAt: null,
          wallClockDuration: null,
          videoTimestamp: null,
        },
      ],
    },
    {
      clientId: "r4",
      state: "passed",
      displayError: null,
      attempts: [
        {
          state: "passed",
          error: null,
          timings: {
            lifecycle: 43,
            test: { fnDuration: 18576, afterFnDuration: 1 },
          },
          failedFromHookId: null,
          wallClockStartedAt: "2022-12-11T08:46:31.893Z",
          wallClockDuration: 18625,
          videoTimestamp: 1172,
        },
      ],
    },
  ],
  exception: null,
  video: false,
  screenshots: [],
  reporterStats: {
    suites: 1,
    tests: 1,
    passes: 1,
    pending: 1,
    failures: 0,
    start: "2022-12-11T08:46:31.884Z",
    end: "2022-12-11T08:46:50.535Z",
    duration: 18651,
  },
  metadata: { studioCreated: 0, studioExtended: 0 },
};

const withException = {
  stats: {
    failures: 1,
    tests: 0,
    passes: 0,
    pending: 0,
    suites: 0,
    skipped: 0,
    wallClockDuration: 0,
    wallClockStartedAt: "2022-12-11T09:09:27.102Z",
    wallClockEndedAt: "2022-12-11T09:09:27.102Z",
  },
  tests: null,
  exception:
    "Oops...we found an error preparing this test file:\n" +
    "\n" +
    "  > cypress/integration/1000.spec.js\n" +
    "\n" +
    "The error was:\n" +
    "\n" +
    "Error: Webpack Compilation Error\n" +
    "./cypress/integration/1000.spec.js\n" +
    "Module not found: Error: Can't resolve './random' in '/Users/agoldis/currents-demo/cypress/integration'\n" +
    "Looked for and couldn't find the file at the following paths:\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.js]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.json]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.jsx]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.mjs]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.coffee]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.ts]\n" +
    "[/Users/agoldis/currents-demo/cypress/integration/random.tsx]\n" +
    " @ ./cypress/integration/1000.spec.js 5:4-23\n" +
    " \n" +
    "    at handle (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/packages/server/node_modules/@cypress/webpack-preprocessor/dist/index.js:231:23)\n" +
    "    at finalCallback (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:257:39)\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:306:14\n" +
    "    at AsyncSeriesHook.eval [as callAsync] (eval at create (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/tapable/lib/HookCodeFactory.js:33:10), <anonymous>:6:1)\n" +
    "    at AsyncSeriesHook.lazyCompileHook (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/tapable/lib/Hook.js:154:20)\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:304:22\n" +
    "    at Compiler.emitRecords (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:499:39)\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:298:10\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:485:14\n" +
    "    at AsyncSeriesHook.eval [as callAsync] (eval at create (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/tapable/lib/HookCodeFactory.js:33:10), <anonymous>:6:1)\n" +
    "    at AsyncSeriesHook.lazyCompileHook (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/tapable/lib/Hook.js:154:20)\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:482:27\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/neo-async/async.js:2818:7\n" +
    "    at done (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/neo-async/async.js:3522:9)\n" +
    "    at AsyncSeriesHook.eval [as callAsync] (eval at create (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/tapable/lib/HookCodeFactory.js:33:10), <anonymous>:6:1)\n" +
    "    at AsyncSeriesHook.lazyCompileHook (/Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/tapable/lib/Hook.js:154:20)\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/node_modules/webpack/lib/Compiler.js:464:33\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/packages/server/node_modules/graceful-fs/graceful-fs.js:143:16\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/packages/server/node_modules/graceful-fs/graceful-fs.js:143:16\n" +
    "    at /Users/agoldis/Library/Caches/Cypress/12.0.2/Cypress.app/Contents/Resources/app/packages/server/node_modules/graceful-fs/graceful-fs.js:61:14\n" +
    "    at FSReqCallback.oncomplete (node:fs:196:23)\n" +
    "\n" +
    "This occurred while Cypress was compiling and bundling your test code. This is usually caused by:\n" +
    "\n" +
    "- A missing file or dependency\n" +
    "- A syntax error in the file or one of its dependencies\n" +
    "\n" +
    "Fix the error in your code and re-run your tests.",
  video: true,
  screenshots: [],
  reporterStats: null,
  metadata: { studioCreated: 0, studioExtended: 0 },
};

const withScreenshots = {
  stats: {
    suites: 0,
    tests: 1,
    passes: 0,
    pending: 0,
    skipped: 0,
    failures: 1,
    wallClockStartedAt: "2022-12-11T09:09:23.978Z",
    wallClockEndedAt: "2022-12-11T09:09:24.198Z",
    wallClockDuration: 220,
  },
  tests: [
    {
      clientId: "r2",
      state: "failed",
      displayError:
        "ReferenceError: The following error originated from your test code, not from Cypress.\n" +
        "\n" +
        "  > fs is not defined\n" +
        "\n" +
        "When Cypress detects uncaught errors originating from your test code it will automatically fail the current test.\n" +
        "\n" +
        "Cypress could not associate this error to any specific test.\n" +
        "\n" +
        "We dynamically generated a new test to display this failure.\n" +
        "    at ./cypress/integration/crash.spec.js (webpack:///./cypress/integration/crash.spec.js:1:0)\n" +
        "    at __webpack_require__ (webpack:///webpack/bootstrap:19:0)\n" +
        "    at 0 (https://en.wikipedia.org/__cypress/tests?p=cypress/integration/crash.spec.js:110:18)\n" +
        "    at __webpack_require__ (webpack:///webpack/bootstrap:19:0)\n" +
        "    at eval (webpack:///webpack/bootstrap:83:0)\n" +
        "    at eval (https://en.wikipedia.org/__cypress/tests?p=cypress/integration/crash.spec.js:87:10)\n" +
        "    at eval (<anonymous>)",
      attempts: [
        {
          state: "failed",
          error: {
            name: "ReferenceError",
            message:
              "The following error originated from your test code, not from Cypress.\n" +
              "\n" +
              "  > fs is not defined\n" +
              "\n" +
              "When Cypress detects uncaught errors originating from your test code it will automatically fail the current test.\n" +
              "\n" +
              "Cypress could not associate this error to any specific test.\n" +
              "\n" +
              "We dynamically generated a new test to display this failure.",
            stack:
              "    at ./cypress/integration/crash.spec.js (webpack:///./cypress/integration/crash.spec.js:1:0)\n" +
              "    at __webpack_require__ (webpack:///webpack/bootstrap:19:0)\n" +
              "    at 0 (https://en.wikipedia.org/__cypress/tests?p=cypress/integration/crash.spec.js:110:18)\n" +
              "    at __webpack_require__ (webpack:///webpack/bootstrap:19:0)\n" +
              "    at eval (webpack:///webpack/bootstrap:83:0)\n" +
              "    at eval (https://en.wikipedia.org/__cypress/tests?p=cypress/integration/crash.spec.js:87:10)\n" +
              "    at eval (<anonymous>)",
            codeFrame: {
              line: 1,
              column: 1,
              originalFile: "cypress/integration/crash.spec.js",
              relativeFile: "cypress/integration/crash.spec.js",
              absoluteFile:
                "/Users/agoldis/currents-demo/cypress/integration/crash.spec.js",
              frame: "> 1 | fs.readFile('non-existing');\n    | ^\n  2 | ",
              language: "js",
            },
          },
          timings: {
            lifecycle: 24,
            test: { fnDuration: 2, afterFnDuration: 168 },
          },
          failedFromHookId: null,
          wallClockStartedAt: "2022-12-11T09:09:23.986Z",
          wallClockDuration: 195,
          videoTimestamp: 630,
        },
      ],
    },
  ],
  exception: null,
  video: true,
  screenshots: [
    {
      screenshotId: "a9jw9",
      name: null,
      testId: "r2",
      testAttemptIndex: 0,
      takenAt: "2022-12-11T09:09:24.015Z",
      height: 1440,
      width: 2560,
    },
  ],
  reporterStats: {
    suites: 0,
    tests: 1,
    passes: 0,
    pending: 0,
    failures: 1,
    start: "2022-12-11T09:09:23.979Z",
    end: "2022-12-11T09:09:24.200Z",
    duration: 221,
  },
  metadata: { studioCreated: 0, studioExtended: 0 },
};
