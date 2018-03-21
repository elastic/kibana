import secureOptions from './secure_options';
import crypto from 'crypto';

const constants = crypto.constants;

describe('secure_options', function () {
  it('allows null', function () {
    expect(secureOptions(null)).toBe(null);
  });

  it ('allows an empty array', function () {
    expect(secureOptions([])).toBe(null);
  });

  it ('removes TLSv1 if we only support TLSv1.1 and TLSv1.2', function () {
    expect(secureOptions(['TLSv1.1', 'TLSv1.2'])).toBe(constants.SSL_OP_NO_TLSv1);
  });

  it ('removes TLSv1.1 and TLSv1.2 if we only support TLSv1', function () {
    expect(secureOptions(['TLSv1'])).toBe(constants.SSL_OP_NO_TLSv1_1 | constants.SSL_OP_NO_TLSv1_2);
  });

  it ('removes TLSv1 and TLSv1.1 if we only support TLSv1.2', function () {
    expect(secureOptions(['TLSv1.2'])).toBe(constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1);
  });

});
