export default async function ({ readConfigFile }) {
  const config4 = await readConfigFile(require.resolve('./config.4'));
  return {
    testFiles: [
      'baz'
    ],
    screenshots: {
      ...config4.get('screenshots')
    }
  };
}
