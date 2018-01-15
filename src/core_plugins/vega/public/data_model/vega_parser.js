import _ from 'lodash';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import schemaParser from 'vega-schema-url-parser';
import versionCompare from 'compare-versions';
import { EsQueryParser } from './es_query_parser';
import hjson from 'hjson';
import { Utils } from './utils';
import { EmsFileParser } from './ems_file_parser';
import { UrlParser } from './url_parser';

const DEFAULT_SCHEMA = 'https://vega.github.io/schema/vega/v3.0.json';

const locToDirMap = {
  left: 'row-reverse',
  right: 'row',
  top: 'column-reverse',
  bottom: 'column'
};

// If there is no "%type%" parameter, use this parser
const DEFAULT_PARSER = 'elasticsearch';

export class VegaParser {

  constructor(spec, searchCache, timeCache, dashboardContext, serviceSettings) {
    this.spec = spec;
    this.hideWarnings = false;
    this.error = undefined;
    this.warnings = [];

    const onWarn = this._onWarning.bind(this);
    this._urlParsers = {
      elasticsearch: new EsQueryParser(timeCache, searchCache, dashboardContext, onWarn),
      emsfile: new EmsFileParser(serviceSettings),
      url: new UrlParser(onWarn),
    };
  }

  async parseAsync() {
    try {
      await this._parseAsync();
    } catch (err) {
      // if we reject current promise, it will use the standard Kibana error handling
      this.error = Utils.formatErrorToStr(err);
    }
    return this;
  }

  async _parseAsync() {
    if (this.isVegaLite !== undefined) throw new Error();

    if (typeof this.spec === 'string') {
      this.spec = hjson.parse(this.spec, { legacyRoot: false });
    }
    if (!_.isPlainObject(this.spec)) {
      throw new Error('Invalid Vega spec');
    }
    this.isVegaLite = this._parseSchema();
    this.useHover = !this.isVegaLite;

    this._config = this._parseConfig();
    this.hideWarnings = !!this._config.hideWarnings;
    this.useMap = this._config.type === 'map';
    this.renderer = this._config.renderer === 'svg' ? 'svg' : 'canvas';

    this._setDefaultColors();
    this._parseControlPlacement(this._config);
    if (this.useMap) {
      this.mapConfig = this._parseMapConfig();
    } else if (this.spec.autosize === undefined) {
      // Default autosize should be fit, unless it's a map (leaflet-vega handles that)
      this.spec.autosize = { type: 'fit', contains: 'padding' };
    }

    await this._resolveDataUrls();

    if (this.isVegaLite) {
      this._compileVegaLite();
    }

    this._calcSizing();
  }

  /**
   * Convert VegaLite to Vega spec
   * @private
   */
  _compileVegaLite() {
    if (this.useMap) {
      throw new Error('"_map" configuration is not compatible with vega-lite spec');
    }
    this.vlspec = this.spec;

    const logger = vega.logger(vega.Warn);
    logger.warn = this._onWarning.bind(this);
    this.spec = vegaLite.compile(this.vlspec, logger).spec;
  }

  /**
   * Process graph size and padding
   * @private
   */
  _calcSizing() {
    this.useResize = !this.useMap && (this.spec.autosize === 'fit' || this.spec.autosize.type === 'fit');

    // Padding is not included in the width/height by default
    this.paddingWidth = 0;
    this.paddingHeight = 0;
    if (this.useResize && this.spec.padding && this.spec.autosize.contains !== 'padding') {
      if (typeof this.spec.padding === 'object') {
        this.paddingWidth += (+this.spec.padding.left || 0) + (+this.spec.padding.right || 0);
        this.paddingHeight += (+this.spec.padding.top || 0) + (+this.spec.padding.bottom || 0);
      } else {
        this.paddingWidth += 2 * (+this.spec.padding || 0);
        this.paddingHeight += 2 * (+this.spec.padding || 0);
      }
    }

    if (this.useResize && (this.spec.width || this.spec.height)) {
      if (this.isVegaLite) {
        delete this.spec.width;
        delete this.spec.height;
      } else {
        this._onWarning(`The 'width' and 'height' params are ignored with autosize=fit`);
      }
    }
  }

  /**
   * Calculate container-direction CSS property for binding placement
   * @private
   */
  _parseControlPlacement() {
    this.containerDir = locToDirMap[this._config.controlsLocation];
    if (this.containerDir === undefined) {
      if (this._config.controlsLocation === undefined) {
        this.containerDir = 'column';
      } else {
        throw new Error('Unrecognized controlsLocation value. Expecting one of ["' +
          locToDirMap.keys().join('", "') + '"]');
      }
    }
    const dir = this._config.controlsDirection;
    if (dir !== undefined && dir !== 'horizontal' && dir !== 'vertical') {
      throw new Error('Unrecognized dir value. Expecting one of ["horizontal", "vertical"]');
    }
    this.controlsDir = dir === 'horizontal' ? 'row' : 'column';
  }

  /**
   * Parse {config: kibana: {...}} portion of the Vega spec (or root-level _hostConfig for backward compat)
   * @returns {object} kibana config
   * @private
   */
  _parseConfig() {
    let result;
    if (this.spec._hostConfig !== undefined) {
      result = this.spec._hostConfig;
      delete this.spec._hostConfig;
      if (!_.isPlainObject(result)) {
        throw new Error('If present, _hostConfig must be an object');
      }
      this._onWarning('_hostConfig has been deprecated. Use config.kibana instead.');
    }
    if (_.isPlainObject(this.spec.config) && this.spec.config.kibana !== undefined) {
      result = this.spec.config.kibana;
      delete this.spec.config.kibana;
      if (!_.isPlainObject(result)) {
        throw new Error('If present, config.kibana must be an object');
      }
    }
    return result || {};
  }

  /**
   * Parse map-specific configuration
   * @returns {{mapStyle: *|string, delayRepaint: boolean, latitude: number, longitude: number, zoom, minZoom, maxZoom, zoomControl: *|boolean, maxBounds: *}}
   * @private
   */
  _parseMapConfig() {
    const res = {
      delayRepaint: this._config.delayRepaint === undefined ? true : this._config.delayRepaint,
    };

    const validate = (name, isZoom) => {
      const val = this._config[name];
      if (val !== undefined) {
        const parsed = Number.parseFloat(val);
        if (Number.isFinite(parsed) && (!isZoom || (parsed >= 0 && parsed <= 30))) {
          res[name] = parsed;
          return;
        }
        this._onWarning(`config.kibana.${name} is not valid`);
      }
      if (!isZoom) res[name] = 0;
    };

    validate(`latitude`, false);
    validate(`longitude`, false);
    validate(`zoom`, true);
    validate(`minZoom`, true);
    validate(`maxZoom`, true);

    // `false` is a valid value
    res.mapStyle = this._config.mapStyle === undefined ? `default` : this._config.mapStyle;
    if (res.mapStyle !== `default` && res.mapStyle !== false) {
      this._onWarning(`config.kibana.mapStyle may either be false or "default"`);
      res.mapStyle = `default`;
    }

    const zoomControl = this._config.zoomControl;
    if (zoomControl === undefined) {
      res.zoomControl = true;
    } else if (typeof zoomControl !== 'boolean') {
      this._onWarning('config.kibana.zoomControl must be a boolean value');
      res.zoomControl = true;
    } else {
      res.zoomControl = zoomControl;
    }

    const maxBounds = this._config.maxBounds;
    if (maxBounds !== undefined) {
      if (!Array.isArray(maxBounds) || maxBounds.length !== 4 ||
        !maxBounds.every(v => typeof v === 'number' && Number.isFinite(v))
      ) {
        this._onWarning(`config.kibana.maxBounds must be an array with four numbers`);
      } else {
        res.maxBounds = maxBounds;
      }
    }

    return res;
  }

  /**
   * Parse Vega schema element
   * @returns {boolean} is this a VegaLite schema?
   * @private
   */
  _parseSchema() {
    if (!this.spec.$schema) {
      this._onWarning(`The input spec does not specify a "$schema", defaulting to "${DEFAULT_SCHEMA}"`);
      this.spec.$schema = DEFAULT_SCHEMA;
    }

    const schema = schemaParser(this.spec.$schema);
    const isVegaLite = schema.library === 'vega-lite';
    const libVersion = isVegaLite ? vegaLite.version : vega.version;

    if (versionCompare(schema.version, libVersion) > 0) {
      this._onWarning(
        `The input spec uses ${schema.library} ${schema.version}, but ` +
        `current version of ${schema.library} is ${libVersion}.`
      );
    }

    return isVegaLite;
  }

  /**
   * Replace all instances of ES requests with raw values.
   * Also handle any other type of url: {type: xxx, ...}
   * @private
   */
  async _resolveDataUrls() {
    const pending = {};

    this._findObjectDataUrls(this.spec, (obj) => {
      const url = obj.url;
      delete obj.url;
      let type = url['%type%'];
      delete url['%type%'];
      if (type === undefined) {
        type = DEFAULT_PARSER;
      }

      const parser = this._urlParsers[type];
      if (parser === undefined) {
        throw new Error(`url: {"%type%": "${type}"} is not supported`);
      }

      let pendingArr = pending[type];
      if (pendingArr === undefined) {
        pending[type] = pendingArr = [];
      }

      pendingArr.push(parser.parseUrl(obj, url));
    });

    const pendingParsers = Object.keys(pending);
    if (pendingParsers.length > 0) {
      // let each parser populate its data in parallel
      await Promise.all(pendingParsers.map(type => this._urlParsers[type].populateData(pending[type])));
    }
  }

  /**
   * Recursively find and callback every instance of the data.url as an object
   * @param {*} obj current location in the object tree
   * @param {function({object})} onFind Call this function for all url objects
   * @param {string} [key] field name of the current object
   * @private
   */
  _findObjectDataUrls(obj, onFind, key) {
    if (Array.isArray(obj)) {
      for (const elem of obj) {
        this._findObjectDataUrls(elem, onFind, key);
      }
    } else if (_.isPlainObject(obj)) {
      if (key === 'data' && _.isPlainObject(obj.url)) {
        // Assume that any  "data": {"url": {...}}  is a request for data
        if (obj.values !== undefined || obj.source !== undefined) {
          throw new Error('Data must not have more than one of "url", "values", and "source"');
        }
        onFind(obj);
      } else {
        for (const k of Object.keys(obj)) {
          this._findObjectDataUrls(obj[k], onFind, k);
        }
      }
    }
  }

  /**
   * Inject default colors into the spec.config
   * @private
   */
  _setDefaultColors() {
    // Default category coloring to the Elastic color scheme
    this._setDefaultValue({ scheme: 'elastic' }, 'config', 'range', 'category');

    // Set default single color to match other Kibana visualizations
    const defaultColor = '#00A69B';
    if (this.isVegaLite) {
      // Vega-Lite: set default color, works for fill and strike --  config: { mark:  { color: '#00A69B' }}
      this._setDefaultValue(defaultColor, 'config', 'mark', 'color');
    } else {
      // Vega - global mark has very strange behavior, must customize each mark type individually
      // https://github.com/vega/vega/issues/1083
      // Don't set defaults if spec.config.mark.color or fill are set
      if (!this.spec.config.mark || (this.spec.config.mark.color === undefined && this.spec.config.mark.fill === undefined)) {
        this._setDefaultValue(defaultColor, 'config', 'arc', 'fill');
        this._setDefaultValue(defaultColor, 'config', 'area', 'fill');
        this._setDefaultValue(defaultColor, 'config', 'line', 'stroke');
        this._setDefaultValue(defaultColor, 'config', 'path', 'stroke');
        this._setDefaultValue(defaultColor, 'config', 'rect', 'fill');
        this._setDefaultValue(defaultColor, 'config', 'rule', 'stroke');
        this._setDefaultValue(defaultColor, 'config', 'shape', 'stroke');
        this._setDefaultValue(defaultColor, 'config', 'symbol', 'fill');
        this._setDefaultValue(defaultColor, 'config', 'trail', 'fill');
      }
    }
  }

  /**
   * Set default value if it doesn't exist.
   * Given an object, and an array of fields, ensure that obj.fld1.fld2. ... .fldN is set to value if it doesn't exist.
   * @param {*} value
   * @param {string} fields
   * @private
   */
  _setDefaultValue(value, ...fields) {
    let o = this.spec;
    for (let i = 0; i < fields.length - 1; i++) {
      const field = fields[i];
      const subObj = o[field];
      if (subObj === undefined) {
        o[field] = {};
      } else if (!_.isPlainObject(subObj)) {
        return;
      }
      o = o[field];
    }
    const lastField = fields[fields.length - 1];
    if (o[lastField] === undefined) {
      o[lastField] = value;
    }
  }

  /**
   * Add a warning to the warnings array
   * @private
   */
  _onWarning() {
    if (!this.hideWarnings) {
      this.warnings.push(Utils.formatWarningToStr(...arguments));
    }
  }
}
