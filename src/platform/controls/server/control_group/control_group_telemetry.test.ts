/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupTelemetry, RawControlGroupAttributes } from '../../common';
import { controlGroupTelemetry, initializeControlGroupTelemetry } from './control_group_telemetry';

// controls attributes with all settings ignored + 3 options lists + hierarchical chaining + label above
const rawControlAttributes1: RawControlGroupAttributes = {
  controlStyle: 'twoLine',
  chainingSystem: 'NONE',
  panelsJSON:
    '{"6fc71ac6-62f9-4ff4-bf5a-d1e066065376":{"order":0,"width":"auto","type":"optionsListControl","explicitInput":{"title":"Carrier","fieldName":"Carrier","id":"6fc71ac6-62f9-4ff4-bf5a-d1e066065376","enhancements":{}}},"1ca90451-908b-4eae-ac4d-535f2e30c4ad":{"order":2,"width":"auto","type":"optionsListControl","explicitInput":{"title":"DestAirportID","fieldName":"DestAirportID","id":"1ca90451-908b-4eae-ac4d-535f2e30c4ad","enhancements":{}}},"71086bac-316d-415f-8aa8-b9a921bc7f58":{"order":1,"width":"auto","type":"optionsListControl","explicitInput":{"title":"DestRegion","fieldName":"DestRegion","id":"71086bac-316d-415f-8aa8-b9a921bc7f58","enhancements":{}}}}',
  ignoreParentSettingsJSON:
    '{"ignoreFilters":true,"ignoreQuery":true,"ignoreTimerange":true,"ignoreValidations":true}',
};

// controls attributes with some settings ignored + 2 range sliders, 1 time slider + No chaining  + label inline
const rawControlAttributes2: RawControlGroupAttributes = {
  controlStyle: 'oneLine',
  chainingSystem: 'NONE',
  panelsJSON:
    '{"9cf90205-e94d-43c9-a3aa-45f359a7522f":{"order":0,"width":"auto","type":"rangeSliderControl","explicitInput":{"title":"DistanceKilometers","fieldName":"DistanceKilometers","id":"9cf90205-e94d-43c9-a3aa-45f359a7522f","enhancements":{}}},"f6b076c6-9ef5-483e-b08d-d313d60d4b8c":{"order":2,"width":"auto","type":"rangeSliderControl","explicitInput":{"title":"DistanceMiles","fieldName":"DistanceMiles","id":"f6b076c6-9ef5-483e-b08d-d313d60d4b8c","enhancements":{}}}}',
  ignoreParentSettingsJSON:
    '{"ignoreFilters":true,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
};

// controls attributes with no settings ignored + 2 options lists, 1 range slider, 1 time slider + hierarchical chaining + label inline
const rawControlAttributes3: RawControlGroupAttributes = {
  controlStyle: 'oneLine',
  chainingSystem: 'HIERARCHICAL',
  panelsJSON:
    '{"9cf90205-e94d-43c9-a3aa-45f359a7522f":{"order":0,"width":"auto","type":"rangeSliderControl","explicitInput":{"title":"DistanceKilometers","fieldName":"DistanceKilometers","id":"9cf90205-e94d-43c9-a3aa-45f359a7522f","enhancements":{}}},"ee325e9e-6ec1-41f9-953f-423d59850d44":{"order":2,"width":"auto","type":"optionsListControl","explicitInput":{"title":"Carrier","fieldName":"Carrier","id":"ee325e9e-6ec1-41f9-953f-423d59850d44","enhancements":{}}},"cb0f5fcd-9ad9-4d4a-b489-b75bd060399b":{"order":3,"width":"auto","type":"optionsListControl","explicitInput":{"title":"DestCityName","fieldName":"DestCityName","id":"cb0f5fcd-9ad9-4d4a-b489-b75bd060399b","enhancements":{}}}}',
  ignoreParentSettingsJSON:
    '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
};

describe('Initialize telemetry', () => {
  test('initializes telemetry when given blank object', () => {
    const initializedTelemetry = initializeControlGroupTelemetry({});
    expect(initializedTelemetry.total).toBe(0);
    expect(initializedTelemetry.chaining_system).toEqual({});
    expect(initializedTelemetry.ignore_settings).toEqual({});
    expect(initializedTelemetry.by_type).toEqual({});
  });

  test('initializes telemetry without overwriting any keys when given a partial telemetry object', () => {
    const partialTelemetry: Partial<ControlGroupTelemetry> = {
      total: 77,
      chaining_system: { TESTCHAIN: 10, OTHERCHAIN: 1 },
      by_type: { test1: { total: 10, details: {} } },
    };
    const initializedTelemetry = initializeControlGroupTelemetry(partialTelemetry);
    expect(initializedTelemetry.total).toBe(77);
    expect(initializedTelemetry.chaining_system).toEqual({ TESTCHAIN: 10, OTHERCHAIN: 1 });
    expect(initializedTelemetry.ignore_settings).toEqual({});
    expect(initializedTelemetry.by_type).toEqual({ test1: { total: 10, details: {} } });
    expect(initializedTelemetry.label_position).toEqual({});
  });

  test('initiailizes telemetry without overwriting any keys when given a completed telemetry object', () => {
    const partialTelemetry: Partial<ControlGroupTelemetry> = {
      total: 5,
      chaining_system: { TESTCHAIN: 10, OTHERCHAIN: 1 },
      by_type: { test1: { total: 10, details: {} } },
      ignore_settings: { ignoreValidations: 12 },
      label_position: { inline: 10, above: 12 },
    };
    const initializedTelemetry = initializeControlGroupTelemetry(partialTelemetry);
    expect(initializedTelemetry.total).toBe(5);
    expect(initializedTelemetry.chaining_system).toEqual({ TESTCHAIN: 10, OTHERCHAIN: 1 });
    expect(initializedTelemetry.ignore_settings).toEqual({ ignoreValidations: 12 });
    expect(initializedTelemetry.by_type).toEqual({ test1: { total: 10, details: {} } });
    expect(initializedTelemetry.label_position).toEqual({ inline: 10, above: 12 });
  });
});

describe('Control group telemetry function', () => {
  let finalTelemetry: ControlGroupTelemetry;

  beforeAll(() => {
    const allControlGroups = [rawControlAttributes1, rawControlAttributes2, rawControlAttributes3];

    finalTelemetry = allControlGroups.reduce<ControlGroupTelemetry>(
      (telemetrySoFar, rawControlGroupAttributes) => {
        return controlGroupTelemetry(
          rawControlGroupAttributes,
          telemetrySoFar
        ) as ControlGroupTelemetry;
      },
      {} as ControlGroupTelemetry
    );
  });

  test('counts all telemetry over multiple runs', () => {
    expect(finalTelemetry.total).toBe(8);
  });

  test('counts control types over multiple runs.', () => {
    expect(finalTelemetry.by_type).toEqual({
      optionsListControl: {
        details: {},
        total: 5,
      },
      rangeSliderControl: {
        details: {},
        total: 3,
      },
    });
  });

  test('collects ignore settings over multiple runs.', () => {
    expect(finalTelemetry.ignore_settings).toEqual({
      ignoreFilters: 2,
      ignoreQuery: 1,
      ignoreTimerange: 1,
      ignoreValidations: 1,
    });
  });

  test('counts various chaining systems over multiple runs.', () => {
    expect(finalTelemetry.chaining_system).toEqual({
      HIERARCHICAL: 1,
      NONE: 2,
    });
  });

  test('counts label positions over multiple runs.', () => {
    expect(finalTelemetry.label_position).toEqual({
      oneLine: 2,
      twoLine: 1,
    });
  });
});
