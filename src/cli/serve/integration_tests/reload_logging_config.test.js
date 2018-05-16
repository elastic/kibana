import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { safeDump } from 'js-yaml';
import es from 'event-stream';
import stripAnsi from 'strip-ansi';
import { readYamlConfig } from '../read_yaml_config';

const testConfigFile = follow('__fixtures__/reload_logging_config/kibana.test.yml');
const kibanaPath = follow('../../../../scripts/kibana.js');

function follow(file) {
  return relative(process.cwd(), resolve(__dirname, file));
}

function setLoggingJson(enabled) {
  const conf = readYamlConfig(testConfigFile);
  conf.logging = conf.logging || {};
  conf.logging.json = enabled;

  const yaml = safeDump(conf);

  writeFileSync(testConfigFile, yaml);
}

const prepareJson = obj => ({
  ...obj,
  pid: '## PID ##',
  '@timestamp': '## @timestamp ##'
});

const prepareLogLine = str =>
  stripAnsi(str.replace(
    /\[\d{2}:\d{2}:\d{2}.\d{3}\]/,
    '[## timestamp ##]'
  ));

describe('Server logging configuration', function () {
  let child;
  let isJson;

  beforeEach(() => {
    isJson = true;
    setLoggingJson(true);
  });

  afterEach(() => {
    isJson = true;
    setLoggingJson(true);

    if (child !== undefined) {
      child.kill();
      child = undefined;
    }
  });

  const isWindows = /^win/.test(process.platform);
  if (isWindows) {
    it('SIGHUP is not a feature of Windows.', () => {
      // nothing to do for Windows
    });
  } else {
    it('should be reloadable via SIGHUP process signaling', function (done) {
      expect.assertions(6);

      child = spawn('node', [kibanaPath, '--config', testConfigFile]);

      child.on('error', err => {
        done(new Error(`error in child process while attempting to reload config. ${err.stack || err.message || err}`));
      });

      child.on('exit', code => {
        expect([null, 0]).toContain(code);
        done();
      });

      child.stdout
        .pipe(es.split())
        .pipe(es.mapSync(line => {
          if (!line) {
            // skip empty lines
            return;
          }

          if (isJson) {
            const data = JSON.parse(line);
            expect(prepareJson(data)).toMatchSnapshot();

            if (data.tags.includes('listening')) {
              switchToPlainTextLog();
            }
          } else if (line.startsWith('{')) {
            // We have told Kibana to stop logging json, but it hasn't completed
            // the switch yet, so we verify the messages that are logged while
            // switching over.

            const data = JSON.parse(line);
            expect(prepareJson(data)).toMatchSnapshot();
          } else {
            // Kibana has successfully stopped logging json, so we verify the
            // log line and kill the server.

            expect(prepareLogLine(line)).toMatchSnapshot();

            child.kill();
            child = undefined;
          }
        }));

      function switchToPlainTextLog() {
        isJson = false;
        setLoggingJson(false);

        // reload logging config
        child.kill('SIGHUP');
      }
    }, 60000);
  }
});
