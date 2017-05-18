export default async function ({ readConfigFile }) {
  const config1 = await readConfigFile(require.resolve('./config.1.js'));

  return {
    testFiles: [
      ...config1.get('testFiles'),
      'config.2'
    ]
  };
}
