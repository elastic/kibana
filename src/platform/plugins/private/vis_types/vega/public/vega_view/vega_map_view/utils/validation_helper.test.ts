/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateZoomSettings } from './validation_helper';

type ValidateZoomSettingsParams = Parameters<typeof validateZoomSettings>;

type MapConfigType = ValidateZoomSettingsParams[0];
type LimitsType = ValidateZoomSettingsParams[1];
type OnWarnType = ValidateZoomSettingsParams[2];

describe('vega_map_view/validation_helper', () => {
  describe('validateZoomSettings', () => {
    let mapConfig: MapConfigType;
    let limits: LimitsType;
    let onWarn: OnWarnType;

    beforeEach(() => {
      onWarn = jest.fn();
      mapConfig = {
        maxZoom: 10,
        minZoom: 5,
        zoom: 5,
      };
      limits = {
        maxZoom: 15,
        minZoom: 2,
      };
    });

    test('should return validated interval', () => {
      expect(validateZoomSettings(mapConfig, limits, onWarn)).toEqual({
        maxZoom: 10,
        minZoom: 5,
        zoom: 5,
      });
    });

    test('should return default interval in case if mapConfig not provided', () => {
      mapConfig = {} as MapConfigType;
      expect(validateZoomSettings(mapConfig, limits, onWarn)).toEqual({
        maxZoom: 15,
        minZoom: 2,
        zoom: 3,
      });
    });

    test('should reset MaxZoom if the passed value is greater than the limit', () => {
      mapConfig = {
        ...mapConfig,
        maxZoom: 20,
      };

      const result = validateZoomSettings(mapConfig, limits, onWarn);

      expect(onWarn).toBeCalledWith('Resetting "maxZoom" to 15');
      expect(result.maxZoom).toEqual(15);
    });

    test('should reset MinZoom if the passed value is greater than the limit', () => {
      mapConfig = {
        ...mapConfig,
        minZoom: 0,
      };

      const result = validateZoomSettings(mapConfig, limits, onWarn);

      expect(onWarn).toBeCalledWith('Resetting "minZoom" to 2');
      expect(result.minZoom).toEqual(2);
    });

    test('should reset Zoom if the passed value is greater than the max limit', () => {
      mapConfig = {
        ...mapConfig,
        zoom: 45,
      };

      const result = validateZoomSettings(mapConfig, limits, onWarn);

      expect(onWarn).toBeCalledWith('Resetting "zoom" to 10');
      expect(result.zoom).toEqual(10);
    });

    test('should reset Zoom if the passed value is greater than the min limit', () => {
      mapConfig = {
        ...mapConfig,
        zoom: 0,
      };

      const result = validateZoomSettings(mapConfig, limits, onWarn);

      expect(onWarn).toBeCalledWith('Resetting "zoom" to 5');
      expect(result.zoom).toEqual(5);
    });

    test('should swap min <--> max values', () => {
      mapConfig = {
        maxZoom: 10,
        minZoom: 15,
      };

      const result = validateZoomSettings(mapConfig, limits, onWarn);

      expect(onWarn).toBeCalledWith('"minZoom" and "maxZoom" have been swapped');
      expect(result).toEqual({ maxZoom: 15, minZoom: 10, zoom: 10 });
    });
  });
});
