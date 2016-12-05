import { spawn } from 'child_process';
import { writeFileSync, readFile } from 'fs';
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
