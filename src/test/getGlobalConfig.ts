import { getGlobalConfig } from '../options/config/globalConfig';

async function init() {
  const username = process.env.username || 'sqren';
  const accessToken = process.env.accessToken;

  // get credentials from env vars
  if (accessToken) {
    process.stdout.write(
      JSON.stringify({ username, accessToken, isConfigFile: false })
    );

    // get credentials from config file
  } else {
    const config = await getGlobalConfig();
    process.stdout.write(JSON.stringify({ ...config, isConfigFile: true }));
  }
}

init();
