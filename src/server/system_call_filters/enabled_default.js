import getosSync from 'getos';
import { promisify } from 'bluebird';

const getos = promisify(getosSync);

// Seccomp is unsupported on RHEL/CentOS before 7.0
const distroSupportsSeccomp = (distro, release) => {
  if (distro.toLowerCase() !== 'centos' && distro.toLowerCase () !== 'red hat linux') {
    return true;
  }
  const releaseNumber = parseInt(release, 10);
  return releaseNumber >= 7.0;
};


export async function getSystemCallFiltersEnabledDefault() {
  const os = await getos();

  if (os.os === 'darwin') {
    return false;
  }

  if (os.os === 'win32') {
    return true;
  }

  if (os.os === 'linux') {
    return distroSupportsSeccomp(os.dist, os.release);
  }

  throw new Error(`Unsupported os ${os.os}`);
}
