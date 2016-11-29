// The default ciphers in node 0.12.x include insecure ciphers, so until
// we enforce a more recent version of node, we craft our own list
// @see https://github.com/nodejs/node/blob/master/src/node_constants.h#L8-L28
export default [
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'DHE-RSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-SHA256',
  'DHE-RSA-AES128-SHA256',
  'ECDHE-RSA-AES256-SHA384',
  'DHE-RSA-AES256-SHA384',
  'ECDHE-RSA-AES256-SHA256',
  'DHE-RSA-AES256-SHA256',
  'HIGH',
  '!aNULL',
  '!eNULL',
  '!EXPORT',
  '!DES',
  '!RC4',
  '!MD5',
  '!PSK',
  '!SRP',
  '!CAMELLIA'
].join(':');
