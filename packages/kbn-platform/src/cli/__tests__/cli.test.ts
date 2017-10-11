jest.mock('../version', () => ({
  version: '5.2.2'
}));

import { parseArgv } from '../cli';
import { captureTerminal } from './captureTerminal';

test('displays help', () => {
  expect(captureTerminal(parseArgv, ['--help'])).toMatchSnapshot();
});

test('displays version', () => {
  expect(captureTerminal(parseArgv, ['--version'])).toMatchSnapshot();
});

test('fails for unknown options', () => {
  expect(captureTerminal(parseArgv, ['--foo'])).toMatchSnapshot();
});

test('fails if port is not a number', () => {
  expect(captureTerminal(parseArgv, ['--port', 'test'])).toMatchSnapshot();
});

test('fails if config file does not exist', () => {
  expect(
    captureTerminal(parseArgv, ['--config', '/some-folder/kibana/config.yml'])
  ).toMatchSnapshot();
});

test('handles args with dashes', () => {
  expect(captureTerminal(parseArgv, ['--base-path'])).toMatchSnapshot();
});

test('handles negative args', () => {
  expect(
    captureTerminal(parseArgv, ['--no-ssl', '--no-base-path'])
  ).toMatchSnapshot();
});
