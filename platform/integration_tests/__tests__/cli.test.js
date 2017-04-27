import runCli from '../runCli';

test('displays help', () => {
  const result = runCli('.', ['--help']);
  expect(result.status).toBe(0);
  expect(result.stdout).toMatchSnapshot();
});
