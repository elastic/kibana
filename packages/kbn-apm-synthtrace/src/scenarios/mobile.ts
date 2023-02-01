/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MobileDevice, apm, ApmFields } from '@kbn/apm-synthtrace-client';
import type {
  DeviceInfo,
  GeoInfo,
  NetworkConnectionInfo,
  OSInfo,
} from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

type DeviceMetadata = DeviceInfo & OSInfo;

const ANDROID_DEVICES: DeviceMetadata[] = [
  {
    manufacturer: 'Samsung',
    modelIdentifier: 'SM-G930F',
    modelName: 'Galaxy S7',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
    runtimeVersion: '2.1.0',
  },
  {
    manufacturer: 'Samsung',
    modelIdentifier: 'SM-G973F',
    modelName: 'Galaxy S10',
    osType: 'android',
    osVersion: '13',
    osFull: 'Android 13, API level 3, BUILD X0ETMUBU2AER2',
    runtimeVersion: '2.0.0',
  },
  {
    manufacturer: 'Samsung',
    modelIdentifier: 'SM-N950F',
    modelName: 'Galaxy Note8',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
    runtimeVersion: '2.1.0',
  },
  {
    manufacturer: 'Huawei',
    modelIdentifier: 'HUAWEI P2-0000',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
    runtimeVersion: '2.1.0',
  },
  {
    manufacturer: 'Huawei',
    modelIdentifier: 'HUAWEI NXT-CL00',
    modelName: 'Mate8',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
    runtimeVersion: '2.1.0',
  },
  {
    manufacturer: 'Huawei',
    modelIdentifier: 'T1-701u',
    modelName: 'MediaPad',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 13, API level 29, BUILD X0ETMUBU2AER2',
    runtimeVersion: '2.0.0',
  },
  {
    manufacturer: 'Google',
    modelIdentifier: 'Pixel 3a',
    modelName: 'Pixel 3a',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
    runtimeVersion: '2.1.0',
  },
  {
    manufacturer: 'Google',
    modelIdentifier: 'Pixel 7 Pro',
    modelName: 'Pixel 7 Pro',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
    runtimeVersion: '2.1.0',
  },
  {
    manufacturer: 'LGE',
    modelIdentifier: 'LG G6',
    modelName: 'LG-LS993',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 12, API level 31, BUILD KJSJADSlKSDAA',
    runtimeVersion: '1.9.0',
  },
  {
    manufacturer: 'LGE',
    modelIdentifier: 'LG K10',
    modelName: 'LG-K425',
    osType: 'android',
    osVersion: '10',
    osFull: 'Android 12, API level 32, BUILD KJSJA342SlKSD',
    runtimeVersion: '1.9.0',
  },
];

const APPLE_DEVICES: DeviceMetadata[] = [
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPhone15,2',
    modelName: 'iPhone 14 Pro',
    osType: 'ios',
    osVersion: '16',
    osFull: 'iOS 16',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPhone14,5',
    modelName: 'iPhone 13',
    osType: 'ios',
    osVersion: '15',
    osFull: 'iOS 15',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPhone11,8',
    modelName: 'iPhone XR',
    osType: 'ios',
    osVersion: '11',
    osFull: 'iOS 11',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPhone9,1',
    modelName: 'iPhone 7',
    osType: 'ios',
    osVersion: '9',
    osFull: 'iOS 9',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPhone13,2',
    modelName: 'iPhone 12',
    osType: 'ios',
    osVersion: '13',
    osFull: 'iOS 13',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPad12,2',
    modelName: 'iPad 9th Gen',
    osType: 'ios',
    osVersion: '12',
    osFull: 'iOS 12',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPad13,7',
    modelName: 'iPad Pro 11 inch 5th Gen',
    osType: 'ios',
    osVersion: '13',
    osFull: 'iPadOS 13',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPad13,11',
    modelName: 'iPad Pro 12.9 inch 5th Gen',
    osType: 'ios',
    osVersion: '13',
    osFull: 'iPadOS 13',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'iPad13,19',
    modelName: 'iPad 10th Gen',
    osType: 'ios',
    osVersion: '13',
    osFull: 'iPadOS 13',
  },
  {
    manufacturer: 'Apple',
    modelIdentifier: 'Watch6,8',
    modelName: 'Apple Watch Series 7 41mm case',
    osType: 'ios',
    osVersion: '6',
    osFull: 'WatchOS 6',
  },
];

type GeoAndNetwork = GeoInfo & NetworkConnectionInfo;

const GEO_AND_NETWORK: GeoAndNetwork[] = [
  {
    clientIp: '223.72.43.22',
    cityName: 'Beijing',
    continentName: 'Asia',
    countryIsoCode: 'CN',
    countryName: 'China',
    regionIsoCode: 'CN-BJ',
    regionName: 'Beijing',
    location: { coordinates: [116.3861, 39.9143], type: 'Point' },
    type: 'wifi',
  },
  {
    clientIp: '20.24.184.101',
    cityName: 'Singapore',
    continentName: 'Asia',
    countryIsoCode: 'SG',
    countryName: 'Singapore',
    location: { coordinates: [103.8554, 1.3036], type: 'Point' },
    type: 'cell',
    subType: 'edge',
    carrierName: 'M1 Limited',
    carrierMNC: '03',
    carrierICC: 'SG',
    carrierMCC: '525',
  },
  {
    clientIp: '178.173.228.103',
    cityName: 'Tokyo',
    continentName: 'Asia',
    countryIsoCode: 'JP',
    countryName: 'Japan',
    regionIsoCode: 'JP-13',
    regionName: 'Tokyo',
    location: { coordinates: [139.7425, 35.6164], type: 'Point' },
    type: 'cell',
    subType: 'edge',
    carrierName: 'Osaka Gas Business Create Co., Ltd.',
    carrierMNC: '17',
    carrierICC: 'JP',
    carrierMCC: '440',
  },
  {
    clientIp: '147.161.184.179',
    cityName: 'Paris',
    continentName: 'Europe',
    countryIsoCode: 'FR',
    countryName: 'France',
    regionIsoCode: 'FR-75',
    regionName: 'Paris',
    location: { coordinates: [2.4075, 48.8323], type: 'Point' },
    type: 'cell',
    subType: 'hspa',
    carrierName: 'Altice',
    carrierMNC: '09',
    carrierICC: 'FR',
    carrierMCC: '208',
  },
  {
    clientIp: '34.136.92.88',
    cityName: 'Council Bluffs',
    continentName: 'North America',
    countryIsoCode: 'US',
    countryName: 'United States',
    regionIsoCode: 'US-IA',
    regionName: 'Iowa',
    location: { coordinates: [-95.8517, 41.2591], type: 'Point' },
    type: 'cell',
    subType: 'lte',
    carrierName: 'Midwest Network Solutions Hub LLC',
    carrierMNC: '070',
    carrierICC: 'US',
    carrierMCC: '313',
  },
  {
    clientIp: '163.116.135.123',
    cityName: 'New York',
    continentName: 'North America',
    countryIsoCode: 'US',
    countryName: 'United States',
    regionIsoCode: 'US-NY',
    regionName: 'New York',
    location: { coordinates: [-73.9877, 40.7425], type: 'Point' },
    type: 'cell',
    subType: 'lte',
    carrierName: 'Texas A&M University',
    carrierMNC: '080',
    carrierICC: 'US',
    carrierMCC: '314',
  },
  {
    clientIp: '163.116.178.27',
    cityName: 'Frankfurt am Main',
    continentName: 'Europe',
    countryIsoCode: 'DE',
    countryName: 'Germany',
    regionIsoCode: 'DE-HE',
    regionName: 'Hesse',
    location: { coordinates: [8.6843, 50.1188], type: 'Point' },
    type: 'cell',
    subType: 'lte',
    carrierName: 'Telekom Deutschland GmbH',
    carrierMNC: '06',
    carrierICC: 'DE',
    carrierMCC: '262',
  },
];

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

const scenario: Scenario<ApmFields> = async ({ scenarioOpts, logger }) => {
  const { numDevices = 10 } = scenarioOpts || {};

  return {
    generate: ({ range }) => {
      const androidDevices = [...Array(numDevices).keys()].map((index) => {
        const deviceMetadata = ANDROID_DEVICES[randomInt(ANDROID_DEVICES.length)];
        const geoNetwork = GEO_AND_NETWORK[randomInt(GEO_AND_NETWORK.length)];
        return apm
          .mobileApp({ name: 'synth-android', environment: ENVIRONMENT, agentName: 'android/java' })
          .mobileDevice()
          .deviceInfo(deviceMetadata)
          .osInfo(deviceMetadata)
          .setGeoInfo(geoNetwork)
          .setNetworkConnection(geoNetwork);
      });

      const iOSDevices = [...Array(numDevices).keys()].map((index) => {
        const deviceMetadata = APPLE_DEVICES[randomInt(APPLE_DEVICES.length)];
        const geoNetwork = GEO_AND_NETWORK[randomInt(GEO_AND_NETWORK.length)];
        return apm
          .mobileApp({ name: 'synth-ios', environment: ENVIRONMENT, agentName: 'iOS/swift' })
          .mobileDevice()
          .deviceInfo(deviceMetadata)
          .osInfo(deviceMetadata)
          .setGeoInfo(geoNetwork)
          .setNetworkConnection(geoNetwork);
      });

      const clickRate = range.ratePerMinute(2);

      const sessionTransactions = (device: MobileDevice) => {
        return clickRate.generator((timestamp, index) => {
          device.startNewSession();
          const framework =
            device.fields['device.manufacturer'] === 'Apple' ? 'iOS' : 'Android Activity';
          return [
            device
              .transaction('Start View - View Appearing', framework)
              .timestamp(timestamp)
              .duration(500)
              .success()
              .children(
                device
                  .span({
                    spanName: 'onCreate',
                    spanType: 'app',
                    spanSubtype: 'external',
                    'service.target.type': 'http',
                    'span.destination.service.resource': 'external',
                  })
                  .duration(50)
                  .success()
                  .timestamp(timestamp + 20),
                device
                  .httpSpan({
                    spanName: 'GET backend:1234',
                    httpMethod: 'GET',
                    httpUrl: 'https://backend:1234/api/start',
                  })
                  .duration(800)
                  .failure()
                  .timestamp(timestamp + 400)
              ),
            device
              .transaction('Second View - View Appearing', framework)
              .timestamp(10000 + timestamp)
              .duration(300)
              .success()
              .children(
                device
                  .httpSpan({
                    spanName: 'GET backend:1234',
                    httpMethod: 'GET',
                    httpUrl: 'https://backend:1234/api/second',
                  })
                  .duration(400)
                  .success()
                  .timestamp(10000 + timestamp + 250)
              ),
            device
              .transaction('Third View - View Appearing', framework)
              .timestamp(20000 + timestamp)
              .duration(300)
              .success()
              .children(
                device
                  .span({
                    spanName: 'onCreate',
                    spanType: 'app',
                    spanSubtype: 'internal',
                  })
                  .duration(50)
                  .success()
                  .timestamp(20000 + timestamp + 20)
              ),
          ];
        });
      };

      return [...androidDevices, ...iOSDevices].map((device) => sessionTransactions(device));
    },
  };
};

export default scenario;
