import { spawn } from 'child_process';
import { promisify } from 'bluebird';
import { writeFile, readFile } from 'fs';
import { relative, resolve } from 'path';
import { safeDump } from 'js-yaml';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import readYamlConfig from '../read_yaml_config';
import expect from 'expect.js';
const testConfigFile = follow(`fixtures/reload_logging_config/kibana.test.yml`);
const pwriteFile = promisify(writeFile);
const preadFile = promisify(readFile);
const mkdir = promisify(mkdirp);
const primraf = promisify(rimraf);

function follow(file) {
  return relative(process.cwd(), resolve(__dirname, file));
}

async function setLoggingDest(to) {
  const conf = readYamlConfig(testConfigFile);
  conf.logging = conf.logging || {};
  conf.logging.dest = follow(to);
  const yaml = safeDump(conf);
  await pwriteFile(testConfigFile, yaml);
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

    const conf = await setLoggingDest(`logs/first.log`);
    const child = spawn(`./bin/kibana`, [`--config`, testConfigFile]);

    // wait for just a bit
    await wait(5000);

    // reload configuration files
    await setLoggingDest(`logs/second.log`);
    child.kill(`SIGHUP`);

    // wait for some logs to be written
    await wait(3000);

    // reset fixture
    await setLoggingDest(`logs/first.log`);

    child.kill();

    const second = await preadFile(follow(`logs/second.log`), 'utf8');
    const lines = second.split('\n');
    const [firstLine] = lines;
    const index = firstLine.indexOf(`"message":"Reloaded logging configuration due to SIGHUP."`);
    expect(second.length > 0).to.be.ok();
    expect(index !== -1).to.be.ok();
  });
});
