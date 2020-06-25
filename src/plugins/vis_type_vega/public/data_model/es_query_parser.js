/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { isPlainObject, cloneDeep } from 'lodash';

const TIMEFILTER = '%timefilter%';
const AUTOINTERVAL = '%autointerval%';
const MUST_CLAUSE = '%dashboard_context-must_clause%';
const FILTER_CLAUSE = '%dashboard_context-filter_clause%';
const MUST_NOT_CLAUSE = '%dashboard_context-must_not_clause%';

// These values may appear in the  'url': { ... }  object
const LEGACY_CONTEXT = '%context_query%';
const CONTEXT = '%context%';
const TIMEFIELD = '%timefield%';

/**
 * This class parses ES requests specified in the data.url objects.
 */
export class EsQueryParser {
  constructor(timeCache, searchAPI, filters, onWarning) {
    this._timeCache = timeCache;
    this._searchAPI = searchAPI;
    this._filters = filters;
    this._onWarning = onWarning;
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Update request object, expanding any context-aware keywords
   */
  parseUrl(dataObject, url) {
    let body = url.body;
    let context = url[CONTEXT];
    delete url[CONTEXT];
    let timefield = url[TIMEFIELD];
    delete url[TIMEFIELD];
    let usesContext = context !== undefined || timefield !== undefined;

    if (body === undefined) {
      url.body = body = {};
    } else if (!isPlainObject(body)) {
      throw new Error(
        i18n.translate('visTypeVega.esQueryParser.urlBodyValueTypeErrorMessage', {
          defaultMessage: '{configName} must be an object',
          values: { configName: 'url.body' },
        })
      );
    }

    // Migrate legacy %context_query% into context & timefield values
    const legacyContext = url[LEGACY_CONTEXT];
    delete url[LEGACY_CONTEXT];
    if (legacyContext !== undefined) {
      if (body.query !== undefined) {
        throw new Error(
          i18n.translate(
            'visTypeVega.esQueryParser.dataUrlMustNotHaveLegacyAndBodyQueryValuesAtTheSameTimeErrorMessage',
            {
              defaultMessage:
                '{dataUrlParam} must not have legacy {legacyContext} and {bodyQueryConfigName} values at the same time',
              values: {
                legacyContext: `"${LEGACY_CONTEXT}"`,
                bodyQueryConfigName: '"body.query"',
                dataUrlParam: '"data.url"',
              },
            }
          )
        );
      } else if (usesContext) {
        throw new Error(
          i18n.translate(
            'visTypeVega.esQueryParser.dataUrlMustNotHaveLegacyContextTogetherWithContextOrTimefieldErrorMessage',
            {
              defaultMessage:
                '{dataUrlParam} must not have {legacyContext} together with {context} or {timefield}',
              values: {
                legacyContext: `"${LEGACY_CONTEXT}"`,
                context: `"${CONTEXT}"`,
                timefield: `"${TIMEFIELD}"`,
                dataUrlParam: '"data.url"',
              },
            }
          )
        );
      } else if (
        legacyContext !== true &&
        (typeof legacyContext !== 'string' || legacyContext.length === 0)
      ) {
        throw new Error(
          i18n.translate('visTypeVega.esQueryParser.legacyContextCanBeTrueErrorMessage', {
            defaultMessage:
              'Legacy {legacyContext} can either be {trueValue} (ignores time range picker), or it can be the name of the time field, e.g. {timestampParam}',
            values: {
              legacyContext: `"${LEGACY_CONTEXT}"`,
              trueValue: 'true',
              timestampParam: '"@timestamp"',
            },
          })
        );
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
        i18n.translate('visTypeVega.esQueryParser.legacyUrlShouldChangeToWarningMessage', {
          defaultMessage: 'Legacy {urlParam}: {legacyUrl} should change to {result}',
          values: {
            legacyUrl: `"${LEGACY_CONTEXT}": ${JSON.stringify(legacyContext)}`,
            result,
            urlParam: '"url"',
          },
        })
      );
    }

    if (body.query !== undefined) {
      if (usesContext) {
        throw new Error(
          i18n.translate(
            'visTypeVega.esQueryParser.urlContextAndUrlTimefieldMustNotBeUsedErrorMessage',
            {
              defaultMessage:
                '{urlContext} and {timefield} must not be used when {queryParam} is set',
              values: {
                timefield: `url.${TIMEFIELD}`,
                urlContext: `url.${CONTEXT}`,
                queryParam: 'url.body.query',
              },
            }
          )
        );
      }
      this._injectContextVars(body.query, true);
    } else if (usesContext) {
      if (timefield) {
        // Inject range filter based on the timefilter values
        body.query = { range: { [timefield]: this._createRangeFilter({ [TIMEFILTER]: true }) } };
      }

      if (context) {
        // Use dashboard context
        const newQuery = cloneDeep(this._filters);
        if (timefield) {
          newQuery.bool.must.push(body.query);
        }
        body.query = newQuery;
      }
    }

    this._injectContextVars(body.aggs, false);
    return { dataObject, url };
  }

  /**
   * Process items generated by parseUrl()
   * @param {object[]} requests each object is generated by parseUrl()
   * @returns {Promise<void>}
   */
  async populateData(requests) {
    const esSearches = requests.map((r) => r.url);
    const data$ = this._searchAPI.search(esSearches);

    const results = await data$.toPromise();

    results.forEach((data) => {
      requests[data.id].dataObject.values = data.rawResponse;
    });
  }

  /**
   * Modify ES request by processing magic keywords
   * @param {*} obj
   * @param {boolean} isQuery - if true, the `obj` belongs to the req's query portion
   */
  _injectContextVars(obj, isQuery) {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        // For arrays, replace MUST_CLAUSE and MUST_NOT_CLAUSE string elements
        for (let pos = 0; pos < obj.length; ) {
          const item = obj[pos];
          if (
            isQuery &&
            (item === FILTER_CLAUSE || item === MUST_CLAUSE || item === MUST_NOT_CLAUSE)
          ) {
            let ctxTag = '';
            switch (item) {
              case FILTER_CLAUSE:
                ctxTag = 'filter';
                break;
              case MUST_CLAUSE:
                ctxTag = 'must';
                break;
              case MUST_NOT_CLAUSE:
                ctxTag = 'must_not';
                break;
            }
            const ctx = cloneDeep(this._filters);
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
            this._injectContextVars(item, isQuery);
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
              throw new Error(
                i18n.translate('visTypeVega.esQueryParser.autointervalValueTypeErrorMessage', {
                  defaultMessage: '{autointerval} must be either {trueValue} or a number',
                  values: {
                    autointerval: `"${AUTOINTERVAL}"`,
                    trueValue: 'true',
                  },
                })
              );
            }
            const bounds = this._timeCache.getTimeBounds();
            obj.interval = EsQueryParser._roundInterval((bounds.max - bounds.min) / size);
            continue;
          }

          // handle %timefilter%
          switch (subObj[TIMEFILTER]) {
            case 'min':
            case 'max':
              // Replace {"%timefilter%": "min|max", ...} object with a timestamp
              obj[prop] = this._getTimeBound(subObj, subObj[TIMEFILTER]);
              continue;
            case true:
              // Replace {"%timefilter%": true, ...} object with the "range" object
              this._createRangeFilter(subObj);
              continue;
            case undefined:
              this._injectContextVars(subObj, isQuery);
              continue;
            default:
              throw new Error(
                i18n.translate('visTypeVega.esQueryParser.timefilterValueErrorMessage', {
                  defaultMessage:
                    '{timefilter} property must be set to {trueValue}, {minValue}, or {maxValue}',
                  values: {
                    timefilter: `"${TIMEFILTER}"`,
                    trueValue: 'true',
                    minValue: '"min"',
                    maxValue: '"max"',
                  },
                })
              );
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
    obj.gte = moment(this._getTimeBound(obj, 'min')).toISOString();
    obj.lte = moment(this._getTimeBound(obj, 'max')).toISOString();
    obj.format = 'strict_date_optional_time';
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
    const bounds = this._timeCache.getTimeBounds();
    let result = bounds[type];

    if (opts.shift) {
      const shift = opts.shift;
      if (typeof shift !== 'number') {
        throw new Error(
          i18n.translate('visTypeVega.esQueryParser.shiftMustValueTypeErrorMessage', {
            defaultMessage: '{shiftParam} must be a numeric value',
            values: {
              shiftParam: '"shift"',
            },
          })
        );
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
          throw new Error(
            i18n.translate('visTypeVega.esQueryParser.unknownUnitValueErrorMessage', {
              defaultMessage: 'Unknown {unitParamName} value. Must be one of: [{unitParamValues}]',
              values: {
                unitParamName: '"unit"',
                unitParamValues: '"week", "day", "hour", "minute", "second"',
              },
            })
          );
      }
      result += shift * multiplier;
    }

    return result;
  }

  /**
   * Adapted from src/legacy/core_plugins/timelion/common/lib/calculate_interval.js
   * @param interval (ms)
   * @returns {string}
   */
  static _roundInterval(interval) {
    switch (true) {
      case interval <= 500: // <= 0.5s
        return '100ms';
      case interval <= 5000: // <= 5s
        return '1s';
      case interval <= 7500: // <= 7.5s
        return '5s';
      case interval <= 15000: // <= 15s
        return '10s';
      case interval <= 45000: // <= 45s
        return '30s';
      case interval <= 180000: // <= 3m
        return '1m';
      case interval <= 450000: // <= 9m
        return '5m';
      case interval <= 1200000: // <= 20m
        return '10m';
      case interval <= 2700000: // <= 45m
        return '30m';
      case interval <= 7200000: // <= 2h
        return '1h';
      case interval <= 21600000: // <= 6h
        return '3h';
      case interval <= 86400000: // <= 24h
        return '12h';
      case interval <= 604800000: // <= 1w
        return '24h';
      case interval <= 1814400000: // <= 3w
        return '1w';
      case interval < 3628800000: // <  2y
        return '30d';
      default:
        return '1y';
    }
  }
}
