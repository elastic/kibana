/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type MobilePlatform = 'android' | 'ios';

export type DeviceProfileId =
  | 'pixel8Android15'
  | 'galaxyS23Android14'
  | 'galaxyA14Android13'
  | 'iphone15ProIos18'
  | 'iphone12Ios17'
  | 'ipadAirIpados18';

/** Device and OS resource attributes, as EDOT Android and EDOT iOS detect them. */
export interface DeviceProfile {
  id: DeviceProfileId;
  platform: MobilePlatform;
  weight: number;
  /** Slower devices take longer to launch the app and show screens. */
  slowdown: number;
  resourceAttributes: Readonly<Record<string, string>>;
}

const androidAttributes = ({
  version,
  apiLevel,
  build,
  model,
  manufacturer,
}: {
  version: string;
  apiLevel: number;
  build: string;
  model: string;
  manufacturer: string;
}): Record<string, string> => ({
  'os.name': 'Android',
  'os.version': version,
  'os.description': `Android ${version}, API level ${apiLevel}, BUILD ${build}`,
  // `Build.MODEL`, the name users see, not a machine identifier
  'device.model.identifier': model,
  'device.manufacturer': manufacturer,
  'process.runtime.name': 'Android Runtime',
  // `java.vm.version` of ART
  'process.runtime.version': '2.1.0',
});

const iosAttributes = ({
  osName,
  version,
  build,
  model,
}: {
  osName: 'iOS' | 'iPadOS';
  version: string;
  build: string;
  model: string;
}): Record<string, string> => {
  const [major, minor = '0', patch = '0'] = version.split('.');
  const fullVersion = `${major}.${minor}.${patch}`;
  return {
    'os.type': 'darwin',
    'os.name': osName,
    'os.version': fullVersion,
    'os.description': `${osName} Version ${version} (Build ${build})`,
    // `hw.machine`, e.g. `iPhone16,1`
    'device.model.identifier': model,
    // EDOT iOS reports the OS as the runtime
    'process.runtime.name': osName,
    'process.runtime.version': fullVersion,
  };
};

export const DEVICE_PROFILES: Readonly<Record<DeviceProfileId, DeviceProfile>> = {
  pixel8Android15: {
    id: 'pixel8Android15',
    platform: 'android',
    weight: 15,
    slowdown: 1,
    resourceAttributes: androidAttributes({
      version: '15',
      apiLevel: 35,
      build: '12621605',
      model: 'Pixel 8',
      manufacturer: 'Google',
    }),
  },
  galaxyS23Android14: {
    id: 'galaxyS23Android14',
    platform: 'android',
    weight: 20,
    slowdown: 1,
    resourceAttributes: androidAttributes({
      version: '14',
      apiLevel: 34,
      build: 'S911BXXS6CXK3',
      model: 'SM-S911B',
      manufacturer: 'samsung',
    }),
  },
  galaxyA14Android13: {
    id: 'galaxyA14Android13',
    platform: 'android',
    weight: 15,
    slowdown: 1.8,
    resourceAttributes: androidAttributes({
      version: '13',
      apiLevel: 33,
      build: 'A145RXXU3BXB1',
      model: 'SM-A145R',
      manufacturer: 'samsung',
    }),
  },
  iphone15ProIos18: {
    id: 'iphone15ProIos18',
    platform: 'ios',
    weight: 25,
    slowdown: 0.8,
    resourceAttributes: iosAttributes({
      osName: 'iOS',
      version: '18.1',
      build: '22B83',
      model: 'iPhone16,1',
    }),
  },
  iphone12Ios17: {
    id: 'iphone12Ios17',
    platform: 'ios',
    weight: 15,
    slowdown: 1.3,
    resourceAttributes: iosAttributes({
      osName: 'iOS',
      version: '17.6.1',
      build: '21G93',
      model: 'iPhone13,2',
    }),
  },
  ipadAirIpados18: {
    id: 'ipadAirIpados18',
    platform: 'ios',
    weight: 10,
    slowdown: 1,
    resourceAttributes: iosAttributes({
      osName: 'iPadOS',
      version: '18.1',
      build: '22B83',
      model: 'iPad13,16',
    }),
  },
};

/** Picks a device profile of `platforms` by weight, or undefined when none has a weight. */
export const pickDeviceProfile = (
  random: () => number = Math.random,
  weightOverrides: Partial<Record<DeviceProfileId, number>> = {},
  platforms: readonly MobilePlatform[] = ['android', 'ios']
): DeviceProfile | undefined => {
  const profiles = Object.values(DEVICE_PROFILES);
  const weights = profiles.map(({ id, weight, platform }) =>
    platforms.includes(platform) ? weightOverrides[id] ?? weight : 0
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  // Drawn even when nothing can be picked, so that filters don't change the later draws
  let threshold = random() * total;
  if (total <= 0) {
    return undefined;
  }

  for (let i = 0; i < profiles.length; i++) {
    threshold -= weights[i];
    if (weights[i] > 0 && threshold < 0) {
      return profiles[i];
    }
  }
  return profiles.filter((_, i) => weights[i] > 0).pop();
};
