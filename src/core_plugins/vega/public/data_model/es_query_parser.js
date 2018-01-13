import _ from 'lodash';

const TIMEFILTER = '%timefilter%';
const AUTOINTERVAL = '%autointerval%';
const MUST_CLAUSE = '%dashboard_context-must_clause%';
const MUST_NOT_CLAUSE = '%dashboard_context-must_not_clause%';

// These values may appear in the  'url': { ... }  object
const LEGACY_CONTEXT = '%context_query%';
const CONTEXT = 'context';
const TIMEFIELD = 'timefield';

/**
 * This class processes all Vega spec customizations,
 * converting url object parameters into query results.
 */
export class EsQueryParser {

  constructor(timefilter, dashboardContext, onWarning) {
    this._timefilter = timefilter;
    this._dashboardContext = dashboardContext;
    this._timeBounds = false;
    this._onWarning = onWarning;
  }

  parseEsRequest(req) {
    const index = req.index;
    let body = req.body;
    let context = req[CONTEXT];
    let timefield = req[TIMEFIELD];
    let usesContext = context !== undefined || timefield !== undefined;
    const injectionOpts = { usesTime: false };

    if (index === undefined || typeof index !== 'string' || index.length === 0) {
      throw new Error('Data must have a url.index string field for ES data sources". ' +
        'Set it to "_all" to search all indexes.');
    }

    if (body === undefined) {
      body = {};
    } else if (!_.isPlainObject(body)) {
      throw new Error('url.body must be an object');
    }

    // Migrate legacy %context_query% into context & timefield values
    const legacyContext = req[LEGACY_CONTEXT];
    if (legacyContext !== undefined) {
      if (body.query !== undefined) {
        throw new Error(`Data url must not have legacy "${LEGACY_CONTEXT}" and "body.query" values at the same time`);
      } else if (usesContext) {
        throw new Error(`Data url must not have "${LEGACY_CONTEXT}" together with "${CONTEXT}" or "${TIMEFIELD}"`);
      } else if (legacyContext !== true && (typeof legacyContext !== 'string' || legacyContext.length === 0)) {
        throw new Error(`Legacy "${LEGACY_CONTEXT}" can either be true (ignores time range picker), ` +
          'or it can be the name of the time field, e.g. "@timestamp"');
      }

      usesContext = true;
      context = true;
      let result = `"url": {"${CONTEXT}": true`;
      if (typeof legacyContext === 'string') {
        timefield = legacyContext;
        result += `, "${TIMEFIELD}": ${JSON.stringify(timefield)}`;
      }
      result += '}';

      this._onWarning(
        `Legacy "url": {"${LEGACY_CONTEXT}": ${JSON.stringify(legacyContext)}} should change to ${result}`);
    }

    if (body.query !== undefined) {
      if (usesContext) {
        throw new Error(`url.${CONTEXT} and url.${TIMEFIELD} must not be used when url.body.query is set`);
      }
      injectionOpts.isQuery = true;
      this._injectContextVars(body.query, injectionOpts);
    } else if (usesContext) {

      if (timefield) {
        // Inject range filter based on the timefilter values
        body.query = { range: { [timefield]: this._createRangeFilter({ [TIMEFILTER]: true }) } };
        injectionOpts.usesTime = true;
      }

      if (context) {
        // Use dashboard context
        const newQuery = this._dashboardContext();
        if (timefield) {
          newQuery.bool.must.push(body.query);
        }
        body.query = newQuery;
      }
    }

    injectionOpts.isQuery = false;
    this._injectContextVars(body.aggs, injectionOpts);

    return { index, body, usesTime: injectionOpts.usesTime };
  }

  /**
   * Modify ES request by processing magic keywords
   * @param {*} obj
   * @param {object} injectionOpts
   * @param {boolean} injectionOpts.isQuery - if true, the `obj` belongs to the req's query portion
   * @param {boolean} injectionOpts.usesTime - [out] will be set to true if request uses timefilter
   */
  _injectContextVars(obj, injectionOpts) {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        // For arrays, replace MUST_CLAUSE and MUST_NOT_CLAUSE string elements
        for (let pos = 0; pos < obj.length;) {
          const item = obj[pos];
          if (injectionOpts.isQuery && (item === MUST_CLAUSE || item === MUST_NOT_CLAUSE)) {
            const ctxTag = item === MUST_CLAUSE ? 'must' : 'must_not';
            const ctx = this._dashboardContext();
            if (ctx && ctx.bool && ctx.bool[ctxTag]) {
              if (Array.isArray(ctx.bool[ctxTag])) {
                // replace one value with an array of values
                obj.splice(pos, 1, ...ctx.bool[ctxTag]);
                pos += ctx.bool[ctxTag].length;
              } else {
                obj[pos++] = ctx.bool[ctxTag];
              }
            } else {
              obj.splice(pos, 1); // remove item, keep pos at the same position
            }
          } else {
            this._injectContextVars(item, injectionOpts);
            pos++;
          }
        }
      } else {
        for (const prop of Object.keys(obj)) {
          const subObj = obj[prop];
          if (!subObj || typeof obj !== 'object') continue;

          // replace "interval": { "%autointerval%": true|integer } with
          // auto-generated range based on the timepicker
          if (prop === 'interval' && subObj[AUTOINTERVAL]) {
            let size = subObj[AUTOINTERVAL];
            if (size === true) {
              size = 50; // by default, try to get ~80 values
            } else if (typeof size !== 'number') {
              throw new Error(`"${AUTOINTERVAL}" must be either true or a number`);
            }
            const bounds = this._getTimeRange();
            obj.interval = EsQueryParser._roundInterval((bounds.max - bounds.min) / size);
            injectionOpts.usesTime = true;
            continue;
          }

          // handle %timefilter%
          switch (subObj[TIMEFILTER]) {
            case 'min':
            case 'max':
              // Replace {"%timefilter%": "min|max", ...} object with a timestamp
              obj[prop] = this._getTimeBound(subObj, subObj[TIMEFILTER]);
              injectionOpts.usesTime = true;
              continue;
            case true:
              // Replace {"%timefilter%": true, ...} object with the "range" object
              this._createRangeFilter(subObj);
              injectionOpts.usesTime = true;
              continue;
            case undefined:
              this._injectContextVars(subObj, injectionOpts);
              continue;
            default:
              throw new Error(`"${TIMEFILTER}" property must be set to true, "min", or "max"`);
          }
        }
      }
    }
  }

  /**
   * replaces given object that contains `%timefilter%` key with the timefilter bounds and optional shift & unit parameters
   * @param {object} obj
   * @return {object}
   */
  _createRangeFilter(obj) {
    obj.gte = this._getTimeBound(obj, 'min');
    obj.lte = this._getTimeBound(obj, 'max');
    obj.format = 'epoch_millis';
    delete obj[TIMEFILTER];
    delete obj.shift;
    delete obj.unit;
    return obj;
  }

  /**
   *
   * @param {object} opts
   * @param {number} [opts.shift]
   * @param {string} [opts.unit]
   * @param {'min'|'max'} type
   * @returns {*}
   */
  _getTimeBound(opts, type) {
    const bounds = this._getTimeRange();
    let result = bounds[type];

    if (opts.shift) {
      const shift = opts.shift;
      if (typeof shift !== 'number') {
        throw new Error('shift must be a numeric value');
      }
      let multiplier;
      switch (opts.unit || 'd') {
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
      result += shift * multiplier;
    }

    return result;
  }

  /**
   * Adapted from src/core_plugins/timelion/common/lib/calculate_interval.js
   * @param interval (ms)
   * @returns {string}
   */
  static _roundInterval(interval) {
    switch (true) {
      case (interval <= 500):         // <= 0.5s
        return '100ms';
      case (interval <= 5000):        // <= 5s
        return '1s';
      case (interval <= 7500):        // <= 7.5s
        return '5s';
      case (interval <= 15000):       // <= 15s
        return '10s';
      case (interval <= 45000):       // <= 45s
        return '30s';
      case (interval <= 180000):      // <= 3m
        return '1m';
      case (interval <= 450000):      // <= 9m
        return '5m';
      case (interval <= 1200000):     // <= 20m
        return '10m';
      case (interval <= 2700000):     // <= 45m
        return '30m';
      case (interval <= 7200000):     // <= 2h
        return '1h';
      case (interval <= 21600000):    // <= 6h
        return '3h';
      case (interval <= 86400000):    // <= 24h
        return '12h';
      case (interval <= 604800000):   // <= 1w
        return '24h';
      case (interval <= 1814400000):  // <= 3w
        return '1w';
      case (interval < 3628800000):   // <  2y
        return '30d';
      default:
        return '1y';
    }
  }

  _getTimeRange() {
    // Caching function
    if (this._timeBounds) return this._timeBounds;
    const bounds = this._timefilter.getBounds();
    this._timeBounds = {
      min: bounds.min.valueOf(),
      max: bounds.max.valueOf()
    };
    return this._timeBounds;
  }
}
