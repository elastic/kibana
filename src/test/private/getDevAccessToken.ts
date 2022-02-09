import 'dotenv/config';

export function getDevAccessToken(): string {
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      'Please create ".env" file containing: `ACCESS_TOKEN="ghp_very_secret"`'
    );
  }

  return accessToken;
}
