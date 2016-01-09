import fs from 'fs';

export default function (kbnServer, server, config) {
  // this mixin is used outside of the kbn server, so it MUST work without a full kbnServer object.
  kbnServer = null;

  // Create a new connection
  var connectionOptions = {
    host: config.get('server.host'),
    port: config.get('server.port'),
    state: {
      strictHeader: false
    },
    routes: {
      cors: config.get('server.cors'),
      payload: {
        maxBytes: config.get('server.maxPayloadBytes')
      }
    }
  };

  // enable tls if ssl key and cert are defined
  if (config.get('server.ssl.key') && config.get('server.ssl.cert')) {
    connectionOptions.tls = {
      key: fs.readFileSync(config.get('server.ssl.key')),
      cert: fs.readFileSync(config.get('server.ssl.cert')),
      // The default ciphers in node 0.12.x include insecure ciphers, so until
      // we enforce a more recent version of node, we craft our own list
      // @see https://github.com/nodejs/node/blob/master/src/node_constants.h#L8-L28
      ciphers: [
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
      ].join(':'),
      // We use the server's cipher order rather than the client's to prevent
      // the BEAST attack
      honorCipherOrder: true
    };
  }

  server.connection(connectionOptions);
}
