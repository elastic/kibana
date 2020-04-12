import { getGlobalConfig } from '../options/config/globalConfig';

async function init() {
  const username = process.env.username || 'sqren';
  const accessToken = process.env.accessToken;

  if (username && accessToken) {
    process.stdout.write(
      JSON.stringify({ username, accessToken, isConfigFile: false })
    );
  } else {
    const config = await getGlobalConfig();
    process.stdout.write(JSON.stringify({ ...config, isConfigFile: true }));
  }
}

init();
