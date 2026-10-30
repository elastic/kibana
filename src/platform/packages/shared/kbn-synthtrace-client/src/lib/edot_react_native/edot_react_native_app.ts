/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { DeviceProfile, MobilePlatform } from './device_profiles';
import { EdotAndroidClient } from './edot_android_client';
import { EdotIosClient } from './edot_ios_client';
import type {
  EdotReactNativeClient,
  EdotReactNativeClientBase,
  EdotReactNativeClientOptions,
} from './edot_react_native_client';

// The native SDK versions that `@elastic/otel-react-native` pins
export const EDOT_ANDROID_VERSION = '1.10.0';
export const EDOT_IOS_VERSION = '2.3.0';

const CLIENT_CLASSES: Readonly<
  Record<
    MobilePlatform,
    new (...args: ConstructorParameters<typeof EdotReactNativeClientBase>) => EdotReactNativeClient
  >
> = {
  android: EdotAndroidClient,
  ios: EdotIosClient,
};

const TELEMETRY_SDK_ATTRIBUTES: Readonly<Record<MobilePlatform, Record<string, string>>> = {
  android: {
    'telemetry.sdk.name': 'android',
    'telemetry.sdk.language': 'java',
    'telemetry.sdk.version': EDOT_ANDROID_VERSION,
  },
  ios: {
    'telemetry.sdk.name': 'iOS',
    'telemetry.sdk.language': 'swift',
    'telemetry.sdk.version': EDOT_IOS_VERSION,
  },
};

export interface EdotReactNativeAppOptions {
  serviceName: string;
  serviceVersion?: string;
  /** Omit it for an app that isn't configured with an environment. */
  environment?: string;
  /** Android application ID and iOS bundle ID. */
  appId?: string;
  /** Android `versionCode` and iOS `CFBundleVersion`. */
  buildNumber?: number;
}

/**
 * A React Native app instrumented with EDOT React Native, which runs EDOT Android and EDOT iOS.
 * Holds the app-level resource attributes of both platforms.
 */
export class EdotReactNativeApp {
  readonly serviceName: string;
  private readonly resourceAttributesByPlatform: Readonly<
    Record<MobilePlatform, Readonly<Record<string, unknown>>>
  >;

  constructor({
    serviceName,
    serviceVersion = '1.0.0',
    environment,
    appId = `com.example.${serviceName.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
    buildNumber = 1,
  }: EdotReactNativeAppOptions) {
    this.serviceName = serviceName;
    const service = { 'service.name': serviceName, 'service.version': serviceVersion };
    this.resourceAttributesByPlatform = {
      android: {
        ...service,
        ...(environment !== undefined ? { 'deployment.environment.name': environment } : {}),
        // The EDOT Android Gradle plugin derives the build ID from the app's ID and versions
        'app.build_id': createHash('sha256')
          .update(`${appId}-${serviceVersion}-${buildNumber}`)
          .digest('hex'),
        ...TELEMETRY_SDK_ATTRIBUTES.android,
      },
      ios: {
        ...service,
        // EDOT iOS writes `default` unless the app configures an environment
        'deployment.environment.name': environment ?? 'default',
        'app.build_id': String(buildNumber),
        ...TELEMETRY_SDK_ATTRIBUTES.ios,
      },
    };
  }

  /** One installation of this app on a device of the given profile. */
  client(profile: DeviceProfile, options: EdotReactNativeClientOptions): EdotReactNativeClient {
    const resourceAttributes = {
      ...this.resourceAttributesByPlatform[profile.platform],
      ...profile.resourceAttributes,
    };
    const clientOptions = { ...options, slowdown: options.slowdown ?? profile.slowdown };
    return new CLIENT_CLASSES[profile.platform](resourceAttributes, clientOptions);
  }
}
