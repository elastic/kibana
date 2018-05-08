import wreck from 'wreck';

export async function getNodeShasums(nodeVersion) {
  const url = `https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`;

  const { res, payload } = await wreck.get(url);

  if (res.statusCode !== 200) {
    throw new Error(`${url} failed with a ${res.statusCode} response`);
  }

  return payload
    .toString('utf8')
    .split('\n')
    .reduce((acc, line) => {
      const [sha, platform] = line.split('  ');

      return {
        ...acc,
        [platform]: sha,
      };
    }, {});
}
