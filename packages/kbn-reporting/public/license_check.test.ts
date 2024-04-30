/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LicenseCheck } from '@kbn/licensing-plugin/public';
import { checkLicense } from './license_check';

describe('License check', () => {
  it('enables and shows links when licenses are good mkay', () => {
    expect(checkLicense({ state: 'valid' })).toEqual({
      enableLinks: true,
      showLinks: true,
      message: '',
    });
  });

  it('disables and shows links when licenses are not valid', () => {
    expect(checkLicense({ state: 'invalid' })).toEqual({
      enableLinks: false,
      showLinks: false,
      message: 'Your license does not support Reporting. Please upgrade your license.',
    });
  });

  it('shows links, but disables them, on expired licenses', () => {
    expect(checkLicense({ state: 'expired' })).toEqual({
      enableLinks: false,
      showLinks: true,
      message: 'You cannot use Reporting because your license has expired.',
    });
  });

  it('shows links, but disables them, when license checks are unavailable', () => {
    expect(checkLicense({ state: 'unavailable' })).toEqual({
      enableLinks: false,
      showLinks: true,
      message:
        'You cannot use Reporting because license information is not available at this time.',
    });
  });

  it('shows and enables links if state is not known', () => {
    expect(checkLicense({ state: 'PONYFOO' } as unknown as LicenseCheck)).toEqual({
      enableLinks: true,
      showLinks: true,
      message: '',
    });
  });
});
