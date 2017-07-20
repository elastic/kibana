import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import { safeDump } from 'js-yaml';
import es from 'event-stream';
import readYamlConfig from '../read_yaml_config';
import expect from 'expect.js';

const testConfigFile = follow(`fixtures/reload_logging_config/kibana.test.yml`);
const cli = follow(`../../../../bin/kibana`);

function follow(file) {
  return relative(process.cwd(), resolve(__dirname, file));
}

function setLoggingJson(enabled) {
  const conf = readYamlConfig(testConfigFile);
  conf.logging = conf.logging || {};
  conf.logging.json = enabled;
  const yaml = safeDump(conf);
  writeFileSync(testConfigFile, yaml);
  return conf;
}

describe(`Server logging configuration`, function () {

  const isWindows = /^win/.test(process.platform);
  if (isWindows) {
    it('SIGHUP is not a feature of Windows.');
  } else {
    it(`should be reloadable via SIGHUP process signaling`, function (done) {
      this.timeout(60000);

      let asserted = false;
      let json = Infinity;
      setLoggingJson(true);
      const child = spawn(cli, [`--config`, testConfigFile]);

      child.on('error', err => {
        done(new Error(`error in child process while attempting to reload config. ${err.stack || err.message || err}`));
      });

      child.on('exit', code => {
        expect([null, 0]).to.contain(code);
        expect(asserted).to.eql(true);
        done();
      });

      child.stdout
        .pipe(es.split())
        .pipe(es.mapSync(function (line) {
          if (!line) {
            return line; // ignore empty lines
          }
          if (json--) {
            expect(parseJsonLogLine).withArgs(line).to.not.throwError();
          } else {
            expectPlainTextLogLine(line);
          }
        }));

      function parseJsonLogLine(line) {
        try {
          const data = JSON.parse(line);
          const listening = data.tags.indexOf(`listening`) !== -1;
          if (listening) {
            switchToPlainTextLog();
          }
        } catch (err) {
          expect(`Error parsing log line as JSON\n ${err.stack || err.message || err}`).to.eql(true);
        }
      }

      function switchToPlainTextLog() {
        json = 3; // ignore both "reloading" messages + ui settings status message
        setLoggingJson(false);
        child.kill(`SIGHUP`); // reload logging config
      }

      function expectPlainTextLogLine(line) {
        // assert
        const tags = `[\u001b[32minfo\u001b[39m][\u001b[36mconfig\u001b[39m]`;
        const status = `Reloaded logging configuration due to SIGHUP.`;
        const expected = `${tags} ${status}`;
        const actual = line.slice(-expected.length);
        expect(actual).to.eql(expected);

        // cleanup
        asserted = true;
        setLoggingJson(true);
        child.kill();
      }
    });
  }
});
