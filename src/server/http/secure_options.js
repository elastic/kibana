import crypto from 'crypto';
import { chain } from 'lodash';

const protocolMap = {
  TLSv1: crypto.constants.SSL_OP_NO_TLSv1,
  'TLSv1.1': crypto.constants.SSL_OP_NO_TLSv1_1,
  'TLSv1.2': crypto.constants.SSL_OP_NO_TLSv1_2
};

export default function (supportedProtocols) {
  if (!supportedProtocols || !supportedProtocols.length) {
    return null;
  }

  return chain(protocolMap)
    .omit(supportedProtocols)
    .values()
    .reduce(function (value, sum) {
      return value | sum;
    }, 0)
    .value();
}
