import { promises as fs } from 'fs';

// get global config: either from .backport/config.json or via env variables
export async function getDevAccessToken(): Promise<string> {
  const accessToken = process.env.accessToken;

  // get accessToken from env vars
  if (accessToken) {
    return accessToken;
  }

  // get credentials from config file
  const accessTokenFile = './src/test/private/accessToken.txt';
  try {
    const accessToken = await fs.readFile(accessTokenFile, {
      encoding: 'utf-8',
    });

    return accessToken.trim();
  } catch (e) {
    throw new Error(`Missing accessToken in "${accessTokenFile}"`);
  }
}
