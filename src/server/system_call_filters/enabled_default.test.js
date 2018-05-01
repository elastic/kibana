jest.mock('getos', () => {
  return jest.fn();
});

import { getSystemCallFiltersEnabledDefault } from './enabled_default';
import getos from 'getos';


function defaultEnabledTest(os, expectedEnabled) {
  test(`${expectedEnabled ? 'enabled' : 'disabled'} on ${JSON.stringify(os)}`, async () => {
    getos.mockImplementation(cb => cb(null, os));
    const actualBrowser = await getSystemCallFiltersEnabledDefault();
    expect(actualBrowser).toBe(expectedEnabled);
  });
}


defaultEnabledTest({ os: 'win32' }, true);
defaultEnabledTest({ os: 'darwin' }, false);
defaultEnabledTest({ os: 'linux', dist: 'Centos', release: '6.0' }, false);
defaultEnabledTest({ os: 'linux', dist: 'Centos', release: '7.0' }, true);
defaultEnabledTest({ os: 'linux', dist: 'Red Hat Linux', release: '6.0' }, false);
defaultEnabledTest({ os: 'linux', dist: 'Red Hat Linux', release: '7.0' }, true);
defaultEnabledTest({ os: 'linux', dist: 'Ubuntu Linux', release: '14.04' }, true);
defaultEnabledTest({ os: 'linux', dist: 'Ubuntu Linux', release: '16.04' }, true);
defaultEnabledTest({ os: 'linux', dist: 'SUSE Linux', release: '11' }, true);
defaultEnabledTest({ os: 'linux', dist: 'SUSE Linux', release: '12' }, true);
defaultEnabledTest({ os: 'linux', dist: 'SUSE Linux', release: '42.0' }, true);
defaultEnabledTest({ os: 'linux', dist: 'Debian', release: '8' }, true);
defaultEnabledTest({ os: 'linux', dist: 'Debian', release: '9' }, true);
