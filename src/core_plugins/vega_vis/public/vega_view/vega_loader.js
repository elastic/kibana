import * as vega from 'vega';

export function createVegaLoader(es, timefilter, dashboardContext) {

  const SIMPLE_QUERY = '%context_query%';
  const TIMEFILTER = '%timefilter%';
  const MUST_CLAUSE = '%dashboard_context-must_clause%';
  const MUST_NOT_CLAUSE = '%dashboard_context-must_not_clause%';

  function queryEsData(uri) {
    uri.body = uri.body || {};
    const body = uri.body;

    if (uri[SIMPLE_QUERY]) {
      if (body.query) {
        throw new Error(`Search request contains both "${SIMPLE_QUERY}" and "body.query" values`);
      }

      const field = uri[SIMPLE_QUERY];
      if (field !== true && (typeof field !== 'string' || field.length === 0)) {
        throw new Error(`"${SIMPLE_QUERY}" can either be true (ignores timefilter), ` +
          'or it can be the name of the time field, e.g. "@timestamp"');
      }
      delete uri[SIMPLE_QUERY];

      body.query = dashboardContext();

      if (field !== true) {
        // Inject range filter based on the timefilter values
        const range = { [TIMEFILTER]: true };
        injectTimeFilter(range);
        body.query.bool.must.push({
          range: {
            [field]: range
          }
        });
      }
    } else {
      injectContextVars(body.query);
    }
    return es.search(uri);
  }

  function injectContextVars(obj) {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        for (let pos = 0; pos < obj.length;) {
          const item = obj[pos];
          if (item === MUST_CLAUSE || item === MUST_NOT_CLAUSE) {
            const ctxTag = item === MUST_CLAUSE ? 'must' : 'must_not';
            const ctx = dashboardContext();
            if (ctx && ctx.bool && ctx.bool[ctxTag]) {
              obj.splice(pos, 1, ...ctx.bool[ctxTag]);  // replace items
              pos += ctx.bool[ctxTag].length;
            } else {
              obj.splice(pos, 1); // remove item, keep pos at the same position
            }
          } else {
            injectContextVars(item);
            pos++;
          }
        }
      } else if (!injectTimeFilter(obj)) {
        for (const prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            injectContextVars(obj[prop]);
          }
        }
      }
    }
  }

  /**
   * If obj contains `%timefilter%` key, remove it, and inject timefilter bounds with optional shift & unit parameters
   * @param obj
   * @return {boolean}
   */
  function injectTimeFilter(obj) {
    if (!obj[TIMEFILTER]) return false;

    delete obj[TIMEFILTER];
    const bounds = timefilter.getBounds();
    obj.gte = bounds.min.valueOf();
    obj.lte = bounds.max.valueOf();
    obj.format = 'epoch_millis';

    if (obj.shift) {
      const shift = obj.shift;
      if (typeof shift !== 'number') {
        throw new Error('shift must be a numeric value');
      }
      delete obj.shift;
      let unit = 'd';
      if (obj.unit) {
        unit = obj.unit;
        delete obj.unit;
      }
      let multiplier;
      switch (unit) {
        case 'w':
        case 'week':
          multiplier = 1000 * 60 * 60 * 24 * 7;
          break;
        case 'd':
        case 'day':
          multiplier = 1000 * 60 * 60 * 24;
          break;
        case 'h':
        case 'hour':
          multiplier = 1000 * 60 * 60;
          break;
        case 'm':
        case 'minute':
          multiplier = 1000 * 60;
          break;
        case 's':
        case 'second':
          multiplier = 1000;
          break;
        default:
          throw new Error('Unknown unit value. Must be one of: [week, day, hour, minute, second]');
      }
      obj.gte += shift * multiplier;
      obj.lte += shift * multiplier;

      return true;
    }
  }

  /**
   * ... the loader instance to use for data file loading. A
   * loader object must provide a "load" method for loading files and a
   * "sanitize" method for checking URL/filename validity. Both methods
   * should accept a URI and options hash as arguments, and return a Promise
   * that resolves to the loaded file contents (load) or a hash containing
   * sanitized URI data with the sanitized url assigned to the "href" property
   * (sanitize).
   */
  const loader = vega.loader();
  const defaultLoad = loader.load.bind(loader);
  loader.load = (uri, opts) => {
    if (typeof uri === 'object') {
      switch (opts.context) {
        case 'dataflow':
          return queryEsData(uri);
      }
      throw new Error('Unexpected uri object');
    }
    return defaultLoad(uri, opts);
  };

  return loader;
}
