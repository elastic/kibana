module.exports = function (server) {
  return class ElasticsearchClientLogging {
    // additional tags to differentiate connection
    get tags() {
      return [];
    }

    get logQueries() {
      return false;
    }

    error(err) {
      server.log(['error', 'elasticsearch'].concat(this.tags), err);
    }

    warning(message) {
      server.log(['warning', 'elasticsearch'].concat(this.tags), message);
    }

    info() {}

    debug() {}

    trace(method, options, query, _response, statusCode) {
      /* Check if query logging is enabled
       * It requires Kibana to be configured with verbose logging turned on. */
      if (this.logQueries) {
        const methodAndPath = `${method} ${options.path}`;
        const queryDsl = query ? query.trim() : '';
        server.log(['elasticsearch', 'query', 'debug'].concat(this.tags), [
          statusCode,
          methodAndPath,
          queryDsl
        ].join('\n'));
      }
    }
    close() {}
  };
};
