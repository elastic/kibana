const Hapi = require('hapi');
const defaultConfig = {
  'kibana.index': '.kibana'
};

export function MockServer(config = defaultConfig) {
  const server = new Hapi.Server();
  server.connection({ port: 8080 });
  server.config = function () {
    return {
      get: (key) => {
        return config[key];
      }
    };
  };

  return server;
}
