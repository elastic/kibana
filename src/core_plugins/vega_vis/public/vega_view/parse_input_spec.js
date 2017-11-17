import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import schemaParser from 'vega-schema-url-parser';
import versionCompare from 'compare-versions';

const DEFAULT_SCHEMA = 'https://vega.github.io/schema/vega/v3.0.json';

const locToDirMap = {
  left: 'row-reverse',
  right: 'row',
  top: 'column-reverse',
  bottom: 'column'
};

export function parseInputSpec(inputSpec, onWarning) {
  let spec = { ...inputSpec };

  if (!spec.$schema) {
    onWarning(`The input spec does not specify a "$schema", defaulting to "${DEFAULT_SCHEMA}"`);
    spec.$schema = DEFAULT_SCHEMA;
  }

  const schema = schemaParser(spec.$schema);
  const isVegaLite = schema.library === 'vega-lite';
  const libVersion = isVegaLite ? vegaLite.version : vega.version;

  if (versionCompare(schema.version, libVersion) > 0) {
    onWarning(
      `The input spec uses "${schema.library}" ${schema.version}, but ` +
      `current version of "${schema.library}" is ${libVersion}.`
    );
  }

  const hostConfig = spec._hostConfig;
  if (hostConfig !== undefined) {
    delete spec.hostConfig;
    if (typeof hostConfig !== 'object') {
      throw new Error('_hostConfig must be an object');
    }
  }

  const hideWarnings = hostConfig && !!hostConfig.hideWarnings;
  if (hideWarnings) {
    onWarning = () => {};
  }

  const useMap = !!(hostConfig && hostConfig.type === 'map');
  let mapStyle = hostConfig && hostConfig.mapStyle;
  let delayRepaint = hostConfig && hostConfig.delayRepaint;
  let latitude = hostConfig && hostConfig.latitude;
  let longitude = hostConfig && hostConfig.longitude;
  let zoom = hostConfig && hostConfig.zoom;
  let minZoom = hostConfig && hostConfig.minZoom;
  let maxZoom = hostConfig && hostConfig.maxZoom;
  let zoomControl = hostConfig && hostConfig.zoomControl;
  let maxBounds = hostConfig && hostConfig.maxBounds;

  if (!useMap && (
    mapStyle !== undefined || delayRepaint !== undefined || latitude !== undefined || longitude !== undefined ||
    zoom !== undefined || minZoom !== undefined || maxZoom !== undefined || zoomControl !== undefined || maxBounds !== undefined
  )) {
    throw new Error('_hostConfig must have type="map" when used with latitude/longitude/zoom parameters');
  }

  if (useMap) {
    // `false` is a valid value
    mapStyle = mapStyle === undefined ? `default` : mapStyle;
    if (mapStyle !== `default` && mapStyle !== false) {
      onWarning(`hostConfig.mapStyle may either be false or "default"`);
      mapStyle = `default`;
    }
    delayRepaint = delayRepaint === undefined ? true : delayRepaint;

    const validate = (name, val, isZoom) => {
      if (val !== undefined) {
        const parsed = Number.parseFloat(val);
        if (Number.isFinite(parsed) && (!isZoom || (parsed >= 0 && parsed <= 30))) {
          return parsed;
        }
        onWarning(`_hostConfig.${name} is not valid`);
      }
      return undefined;
    };

    longitude = validate('longitude', longitude) || 0;
    latitude = validate('latitude', latitude) || 0;
    zoom = validate(`zoom`, zoom, true);
    minZoom = validate(`minZoom`, minZoom, true);
    maxZoom = validate(`maxZoom`, maxZoom, true);

    if (zoomControl === undefined) {
      zoomControl = true;
    } else if (typeof zoomControl !== 'boolean') {
      onWarning('zoomControl must be a boolean value');
      zoomControl = true;
    }

    if (maxBounds !== undefined && (!Array.isArray(maxBounds) || maxBounds.length !== 4 ||
        !maxBounds.every(v => typeof v === 'number' && Number.isFinite(v)))) {
      onWarning(`hostConfig.maxBounds must be an array with four numbers`);
      maxBounds = undefined;
    }
  }

  // Calculate container-direction CSS property for binding placement
  const controlsLocation = hostConfig && hostConfig.controlsLocation;
  let containerDir = locToDirMap[controlsLocation];
  if (containerDir === undefined) {
    if (controlsLocation === undefined) {
      containerDir = 'column';
    } else {
      throw new Error('Unrecognized controlsLocation value. Expecting one of ["' +
          locToDirMap.keys().join('", "') +
          '"]'
      );
    }
  }
  const controlsDirection = hostConfig && hostConfig.controlsDirection;
  if (controlsDirection !== undefined && controlsDirection !== 'horizontal' && controlsDirection !== 'vertical') {
    throw new Error('Unrecognized controlsDirection value. Expecting one of ["horizontal", "vertical"]');
  }
  const controlsDir = controlsDirection === 'horizontal' ? 'row' : 'column';

  // Default autosize should be fit, unless it's a map (leaflet-vega handles that)
  if (spec.autosize === undefined && !useMap) {
    spec.autosize = { type: 'fit', contains: 'padding' };
  }

  const vlspec = isVegaLite ? spec : undefined;

  if (isVegaLite) {
    if (useMap) {
      throw new Error('"_map" configuration is not compatible with vega-lite spec');
    }
    const logger = vega.logger(vega.Warn);
    logger.warn = onWarning;
    spec = vegaLite.compile(vlspec, logger).spec;
  }

  const useResize = !useMap && (spec.autosize === 'fit' || spec.autosize.type === 'fit');
  const useHover = !isVegaLite;

  // Padding is not included in the width/height by default
  let paddingWidth = 0;
  let paddingHeight = 0;
  if (useResize && spec.padding && spec.autosize.contains !== 'padding') {
    if (typeof spec.padding === 'object') {
      paddingWidth += (+spec.padding.left || 0) + (+spec.padding.right || 0);
      paddingHeight += (+spec.padding.top || 0) + (+spec.padding.bottom || 0);
    } else {
      paddingWidth += 2 * (+spec.padding || 0);
      paddingHeight += 2 * (+spec.padding || 0);
    }
  }

  if (useResize && (spec.width || spec.height)) {
    if (vegaLite) {
      delete spec.width;
      delete spec.height;
    } else {
      onWarning('The \'width\' and \'height\' params are ignored with autosize=fit');
    }
  }

  return {
    spec, vlspec, paddingWidth, paddingHeight, useMap, mapStyle, delayRepaint, latitude, longitude,
    zoom, minZoom, maxZoom, zoomControl, maxBounds,
    useResize, useHover, containerDir, controlsDir, hideWarnings
  };
}
