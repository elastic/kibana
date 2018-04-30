export function setupBasePathProvider(server, config) {

  server.decorate('request', 'setBasePath', function (basePath) {
    const request = this;
    if (request.app._basePath) {
      throw new Error(`Request basePath was previously set. Setting multiple times is not supported.`);
    }
    request.app._basePath = basePath;
  });

  server.decorate('request', 'getBasePath', function () {
    const request = this;

    const serverBasePath = config.get('server.basePath');
    const requestBasePath = request.app._basePath || '';

    return `${serverBasePath}${requestBasePath}`;
  });
}
