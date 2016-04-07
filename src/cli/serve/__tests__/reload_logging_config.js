import { spawn } from 'child_process';
import { writeFileSync, readFile } from 'fs';
import { relative, resolve } from 'path';
import { safeDump } from 'js-yaml';
import es from 'event-stream';
import readYamlConfig from '../read_yaml_config';
import expect from 'expect.js';
const testConfigFile = follow(`fixtures/reload_logging_config/kibana.test.yml`);

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
  it(`should be reloadable via SIGHUP process signaling`, function (done) {
    let asserted = false;
    let json = Infinity;
    const conf = setLoggingJson(true);
    const child = spawn(`./bin/kibana`, [`--config`, testConfigFile]);

    child.on('error', () => {
      done(new Error('error in child process while attempting to reload config.'));
    });

    child.on('exit', (code) => {
      expect(asserted).to.eql(true);
      expect(code === null || code === 0).to.eql(true);
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
      const data = JSON.parse(line);
      const listening = data.tags.indexOf(`listening`) !== -1;
      if (listening) {
        switchToPlainTextLog();
      }
    }

    function switchToPlainTextLog() {
      json = 2; // ignore both "reloading" messages
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
});
