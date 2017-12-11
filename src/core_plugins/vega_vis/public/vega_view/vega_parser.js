import _ from 'lodash';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import schemaParser from 'vega-schema-url-parser';
import versionCompare from 'compare-versions';
import { EsQueryParser } from './es_query_parser';
import hjson from 'hjson';

const DEFAULT_SCHEMA = 'https://vega.github.io/schema/vega/v3.0.json';

const locToDirMap = {
  left: 'row-reverse',
  right: 'row',
  top: 'column-reverse',
  bottom: 'column'
};

export class VegaParser {

  constructor(spec, es, timefilter, dashboardContext, hackVals) {

    // FIXME: hackVals are a workaround, and should be passed directly to view
    this.hackVals = hackVals;

    this.spec = spec;
    this.hideWarnings = false;
    this.warnings = [];
    this.es = es;
    this.esQueryParser = new EsQueryParser(timefilter, dashboardContext);
  }

  onWarning(warning) {
    if (!this.hideWarnings) {
      this.warnings.push(warning);
    }
  }

  async parse() {
    if (this.isVegaLite !== undefined) throw new Error();

    if (typeof this.spec === 'string') {
      this.spec = hjson.parse(this.spec);
    }
    if (!_.isPlainObject(this.spec)) {
      throw new Error('Invalid Vega spec');
    }
    this.isVegaLite = this.parseSchema();
    this.useHover = !this.isVegaLite;
    this.config = this.parseConfig();
    this.hideWarnings = !!this.config.hideWarnings;
    this.useMap = this.config.type === 'map';

    this.setDefaultColors();
    this.parseControlPlacement(this.config);
    if (this.useMap) {
      this.mapConfig = this.parseMapConfig();
    } else if (this.spec.autosize === undefined) {
      // Default autosize should be fit, unless it's a map (leaflet-vega handles that)
      this.spec.autosize = { type: 'fit', contains: 'padding' };
    }

    await this.resolveEsQueries();

    if (this.isVegaLite) {
      this.parseVegaLite();
    }
    this.calcSizing();

    return this;
  }

  parseVegaLite() {
    if (this.useMap) {
      throw new Error('"_map" configuration is not compatible with vega-lite spec');
    }
    this.vlspec = this.spec;

    const logger = vega.logger(vega.Warn);
    logger.warn = this.onWarning.bind(this);
    this.spec = vegaLite.compile(this.vlspec, logger).spec;
  }

  calcSizing() {
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
      if (vegaLite) {
        delete this.spec.width;
        delete this.spec.height;
      } else {
        this.onWarning(`The 'width' and 'height' params are ignored with autosize=fit`);
      }
    }
  }

  /**
   * Calculate container-direction CSS property for binding placement
   */
  parseControlPlacement() {
    this.containerDir = locToDirMap[this.config.controlsLocation];
    if (this.containerDir === undefined) {
      if (this.config.controlsLocation === undefined) {
        this.containerDir = 'column';
      } else {
        throw new Error('Unrecognized controlsLocation value. Expecting one of ["' +
          locToDirMap.keys().join('", "') + '"]');
      }
    }
    const dir = this.config.controlsDirection;
    if (dir !== undefined && dir !== 'horizontal' && dir !== 'vertical') {
      throw new Error('Unrecognized dir value. Expecting one of ["horizontal", "vertical"]');
    }
    this.controlsDir = dir === 'horizontal' ? 'row' : 'column';
  }

  parseConfig() {
    let result;
    if (this.spec._hostConfig !== undefined) {
      result = this.spec._hostConfig;
      delete this.spec._hostConfig;
      if (!_.isPlainObject(result)) {
        throw new Error('If present, _hostConfig must be an object');
      }
      this.onWarning('_hostConfig has been deprecated. Use config.kibana instead.');
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

  parseMapConfig() {
    const validate = (name, val, isZoom) => {
      if (val !== undefined) {
        const parsed = Number.parseFloat(val);
        if (Number.isFinite(parsed) && (!isZoom || (parsed >= 0 && parsed <= 30))) {
          return parsed;
        }
        this.onWarning(`config.kibana.${name} is not valid`);
      }
      return undefined;
    };

    const res = {
      mapStyle: this.config.mapStyle,
      delayRepaint: this.config.delayRepaint === undefined ? true : this.config.delayRepaint,
      latitude: validate(`latitude`, this.config.latitude) || 0,
      longitude: validate(`longitude`, this.config.longitude) || 0,
      zoom: validate(`zoom`, this.config.zoom, true),
      minZoom: validate(`minZoom`, this.config.minZoom, true),
      maxZoom: validate(`maxZoom`, this.config.maxZoom, true),
      zoomControl: this.config.zoomControl,
      maxBounds: this.config.maxBounds,
    };

    // `false` is a valid value
    res.mapStyle = res.mapStyle === undefined ? `default` : res.mapStyle;
    if (res.mapStyle !== `default` && res.mapStyle !== false) {
      this.onWarning(`config.kibana.mapStyle may either be false or "default"`);
      res.mapStyle = `default`;
    }

    if (res.zoomControl === undefined) {
      res.zoomControl = true;
    } else if (typeof res.zoomControl !== 'boolean') {
      this.onWarning('config.kibana.zoomControl must be a boolean value');
      res.zoomControl = true;
    }

    if (res.maxBounds !== undefined &&
      (!Array.isArray(res.maxBounds) || res.maxBounds.length !== 4 ||
        !res.maxBounds.every(v => typeof v === 'number' && Number.isFinite(v)))) {
      this.onWarning(`config.kibana.maxBounds must be an array with four numbers`);
      res.maxBounds = undefined;
    }

    return res;
  }

  parseSchema() {
    if (!this.spec.$schema) {
      this.onWarning(`The input spec does not specify a "$schema", defaulting to "${DEFAULT_SCHEMA}"`);
      this.spec.$schema = DEFAULT_SCHEMA;
    }

    const schema = schemaParser(this.spec.$schema);
    const isVegaLite = schema.library === 'vega-lite';
    const libVersion = isVegaLite ? vegaLite.version : vega.version;

    if (versionCompare(schema.version, libVersion) > 0) {
      this.onWarning(
        `The input spec uses "${schema.library}" ${schema.version}, but ` +
        `current version of "${schema.library}" is ${libVersion}.`
      );
    }

    return isVegaLite;
  }

  /**
   * Record every usage
   */
  async resolveEsQueries() {
    // TODO: switch to ES _msearch, instead of doing it one by one
    const sources = [];
    this.findEsRequests((obj, esReq) => sources.push({ obj, esReq }), this.spec);

    for (const { obj, esReq } of sources) {
      obj.values = await this.es.search(esReq);
    }
  }

  findEsRequests(onFind, obj, key) {
    if (Array.isArray(obj)) {
      for (const elem of obj) {
        this.findEsRequests(onFind, elem, key);
      }
    } else if (_.isPlainObject(obj)) {
      if (key === 'data') {
        // Assume that any  "data": {...}  is a request for data
        const { esRequest, esIndex, esContext } = obj;
        if (esRequest !== undefined || esIndex !== undefined || esContext !== undefined) {
          if (obj.url !== undefined || obj.values !== undefined || obj.source !== undefined) {
            throw new Error('Data must not have "url", "values", and "source" when using ' +
              'Elasticsearch parameters like esRequest, esIndex, or esContext.');
          }
          delete obj.esRequest;
          delete obj.esIndex;
          delete obj.esContext;
          onFind(obj, this.esQueryParser.parseEsRequest(esRequest, esIndex, esContext));
        }
      } else {
        for (const k of Object.keys(obj)) {
          this.findEsRequests(onFind, obj[k], k);
        }
      }
    }
  }

  /**
   * Inject default colors into the spec.config
   */
  setDefaultColors() {
    // Default category coloring to the Elastic color scheme
    this.setDefaultValue({ scheme: 'elastic' }, 'config', 'range', 'category');

    // Set default single color to match other Kibana visualizations
    const defaultColor = '#00A69B';
    if (this.isVegaLite) {
      // Vega-Lite: set default color, works for fill and strike --  config: { mark:  { color: '#00A69B' }}
      this.setDefaultValue(defaultColor, 'config', 'mark', 'color');
    } else {
      // Vega - global mark has very strange behavior, must customize each mark type individually
      // https://github.com/vega/vega/issues/1083
      // Don't set defaults if spec.config.mark.color or fill are set
      if (!this.spec.config.mark || (this.spec.config.mark.color === undefined && this.spec.config.mark.fill === undefined)) {
        this.setDefaultValue(defaultColor, 'config', 'arc', 'fill');
        this.setDefaultValue(defaultColor, 'config', 'area', 'fill');
        this.setDefaultValue(defaultColor, 'config', 'line', 'stroke');
        this.setDefaultValue(defaultColor, 'config', 'path', 'stroke');
        this.setDefaultValue(defaultColor, 'config', 'rect', 'fill');
        this.setDefaultValue(defaultColor, 'config', 'rule', 'stroke');
        this.setDefaultValue(defaultColor, 'config', 'shape', 'stroke');
        this.setDefaultValue(defaultColor, 'config', 'symbol', 'fill');
        this.setDefaultValue(defaultColor, 'config', 'trail', 'fill');
      }
    }
  }

  /**
   * Set default value if it doesn't exist.
   * Given an object, and an array of fields, ensure that obj.fld1.fld2. ... .fldN is set to value if it doesn't exist.
   * @param {*} value
   * @param {string} fields
   */
  setDefaultValue(value, ...fields) {
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
}
