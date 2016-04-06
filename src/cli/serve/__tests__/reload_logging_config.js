import { spawn } from 'child_process';
import { promisify } from 'bluebird';
import { writeFileSync, readFile } from 'fs';
import { relative, resolve } from 'path';
import { safeDump } from 'js-yaml';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import es from 'event-stream';
import readYamlConfig from '../read_yaml_config';
import expect from 'expect.js';
const testConfigFile = follow(`fixtures/reload_logging_config/kibana.test.yml`);
const preadFile = promisify(readFile);
const mkdir = promisify(mkdirp);
const primraf = promisify(rimraf);

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

function wait(time) {
  return new Promise(resolve => setTimeout(() => resolve(), time));
}

describe(`Server logging configuration`, function () {
  it(`should wait`, async function () {
    const testLogsDirectory = follow(`logs`);
    await primraf(testLogsDirectory);
    await mkdir(testLogsDirectory);

    let json = Infinity;
    const conf = setLoggingJson(true);
    const child = spawn(`./bin/kibana`, [`--config`, testConfigFile]);

    child.stdout
      .pipe(es.split())
      .pipe(es.mapSync(function (line) {
        if (!line) {
          return line; // ignore empty lines
        }
        if (json--) {
          parseJsonLogLine(line);
        } else {
          expectPlainTextLogLine(line);
        }
      }));

    function parseJsonLogLine(line) {
      const data = JSON.parse(line);
      const listening = data.tags.indexOf('listening') !== -1;
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
      // cleanup
      setLoggingJson(true);
      child.kill();

      // assert
      const tags = `[\u001b[32minfo\u001b[39m][\u001b[36mconfig\u001b[39m]`;
      const status = `Reloaded logging configuration due to SIGHUP.`;
      const index = line.indexOf(`${tags} ${status}`);
      expect(line.length > 0).to.be.ok();
      expect(index !== -1).to.be.ok();
    }
  });
});
