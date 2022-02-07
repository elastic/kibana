import { readFile } from 'fs/promises';
import { resolve } from 'path';

// get global config: either from .backport/config.json or via env variables
export async function getDevAccessToken(): Promise<string> {
  const accessToken = process.env.accessToken;

  // get accessToken from env vars
  if (accessToken) {
    return accessToken;
  }

  // get credentials from config file
  const accessTokenFile = resolve('./src/test/private/accessToken.txt');
  try {
    const accessToken = await readFile(accessTokenFile, {
      encoding: 'utf-8',
    });

    return accessToken.trim();
  } catch (e) {
    throw new Error(
      `Missing accessToken in "${accessTokenFile}":\n${e.message}`
    );
  }
}
