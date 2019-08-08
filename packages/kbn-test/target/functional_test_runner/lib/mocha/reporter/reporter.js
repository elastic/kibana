"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MochaReporterProvider = MochaReporterProvider;

var _util = require("util");

var _mocha = _interopRequireDefault(require("mocha"));

var _devUtils = require("@kbn/dev-utils");

var _moment = _interopRequireDefault(require("moment"));

var _dev = require("../../../../../../../src/dev");

var colors = _interopRequireWildcard(require("./colors"));

var symbols = _interopRequireWildcard(require("./symbols"));

var _ms = require("./ms");

var _write_epilogue = require("./write_epilogue");

var _log_cache = require("../../../../../../../src/dev/mocha/log_cache");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function MochaReporterProvider({
  getService
}) {
  var _temp;

  const log = getService('log');
  const config = getService('config');
  let originalLogWriters;
  let reporterCaptureStartTime;
  return _temp = class MochaReporter extends _mocha.default.reporters.Base {
    constructor(runner, options) {
      super(runner, options);

      _defineProperty(this, "onStart", () => {
        if (config.get('mochaReporter.captureLogOutput')) {
          log.warning('debug logs are being captured, only error logs will be written to the console');
          reporterCaptureStartTime = (0, _moment.default)();
          originalLogWriters = log.getWriters();
          log.setWriters([new _devUtils.ToolingLogTextWriter({
            level: 'error',
            writeTo: process.stdout
          }), new _devUtils.ToolingLogTextWriter({
            level: 'debug',
            writeTo: {
              write: line => {
                // if the current runnable is a beforeEach hook then
                // `runner.suite` is set to the suite that defined the
                // hook, rather than the suite executing, so instead we
                // grab the suite from the test, but that's only available
                // when we are doing something test specific, so for global
                // hooks we fallback to `runner.suite`
                const currentSuite = this.runner.test ? this.runner.test.parent : this.runner.suite; // We are computing the difference between the time when this
                // reporter has started and the time when each line are being
                // logged in order to be able to label the test results log lines
                // with this relative time information

                const diffTimeSinceStart = (0, _moment.default)().diff(reporterCaptureStartTime);
                const readableDiffTimeSinceStart = `[${(0, _moment.default)(diffTimeSinceStart).format('HH:mm:ss')}] `;
                (0, _log_cache.recordLog)(currentSuite, `${readableDiffTimeSinceStart} ${line}`);
              }
            }
          })]);
        }

        log.write('');
      });

      _defineProperty(this, "onHookStart", hook => {
        log.write(`-> ${colors.suite(hook.title)}`);
        log.indent(2);
      });

      _defineProperty(this, "onHookEnd", () => {
        log.indent(-2);
      });

      _defineProperty(this, "onSuiteStart", suite => {
        if (!suite.root) {
          log.write('-: ' + colors.suite(suite.title));
        }

        log.indent(2);
      });

      _defineProperty(this, "onSuiteEnd", () => {
        if (log.indent(-2) === 0) {
          log.write();
        }
      });

      _defineProperty(this, "onTestStart", test => {
        log.write(`-> ${test.title}`);
        log.indent(2);
      });

      _defineProperty(this, "onTestEnd", test => {
        (0, _log_cache.snapshotLogsForRunnable)(test);
        log.indent(-2);
      });

      _defineProperty(this, "onPending", test => {
        log.write('-> ' + colors.pending(test.title));
        log.indent(2);
      });

      _defineProperty(this, "onPass", test => {
        const time = colors.speed(test.speed, ` (${(0, _ms.ms)(test.duration)})`);
        const pass = colors.pass(`${symbols.ok} pass`);
        log.write(`- ${pass} ${time} "${test.fullTitle()}"`);
      });

      _defineProperty(this, "onFail", runnable => {
        // NOTE: this is super gross
        //
        //  - I started by trying to extract the Base.list() logic from mocha
        //    but it's a lot more complicated than this is horrible.
        //  - In order to fix the numbering and indentation we monkey-patch
        //    console.log and parse the logged output.
        //
        let output = '';
        const realLog = console.log;

        console.log = (...args) => output += `${(0, _util.format)(...args)}\n`;

        try {
          _mocha.default.reporters.Base.list([runnable]);
        } finally {
          console.log = realLog;
        }

        log.write(`- ${colors.fail(`${symbols.err} fail: "${runnable.fullTitle()}"`)}` + '\n' + output.split('\n') // drop the first two lines, (empty + test title)
        .slice(2) // move leading colors behind leading spaces
        .map(line => line.replace(/^((?:\[.+m)+)(\s+)/, '$2$1')).map(line => ` ${line}`).join('\n')); // failed hooks trigger the `onFail(runnable)` callback, so we snapshot the logs for
        // them here. Tests will re-capture the snapshot in `onTestEnd()`

        (0, _log_cache.snapshotLogsForRunnable)(runnable);
      });

      _defineProperty(this, "onEnd", () => {
        if (originalLogWriters) {
          log.setWriters(originalLogWriters);
        }

        (0, _write_epilogue.writeEpilogue)(log, this.stats);
      });

      runner.on('start', this.onStart);
      runner.on('hook', this.onHookStart);
      runner.on('hook end', this.onHookEnd);
      runner.on('test', this.onTestStart);
      runner.on('suite', this.onSuiteStart);
      runner.on('pending', this.onPending);
      runner.on('pass', this.onPass);
      runner.on('fail', this.onFail);
      runner.on('test end', this.onTestEnd);
      runner.on('suite end', this.onSuiteEnd);
      runner.on('end', this.onEnd);

      if (config.get('junit.enabled') && config.get('junit.reportName')) {
        (0, _dev.setupJUnitReportGeneration)(runner, {
          reportName: config.get('junit.reportName')
        });
      }
    }

  }, _temp;
}