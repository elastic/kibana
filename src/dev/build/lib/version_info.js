import os from 'os';

import execa from 'execa';

async function getBuildNumber() {
  if (/^win/.test(os.platform())) {
    // Windows does not have the wc process and `find /C /V ""` does not consistently work
    const log = await execa('git', ['log', '--format="%h"']);
    return log.stdout.split('\n').length;
  }

  const wc = await execa.shell('git log --format="%h" | wc -l');
  return parseFloat(wc.stdout.trim());
}

export async function getVersionInfo({ isRelease, pkg }) {
  return {
    buildSha: await execa.stdout('git', ['rev-parse', 'HEAD']),
    buildVersion: isRelease ? pkg.version : `${pkg.version}-SNAPSHOT`,
    buildNumber: await getBuildNumber(),
  };
}
