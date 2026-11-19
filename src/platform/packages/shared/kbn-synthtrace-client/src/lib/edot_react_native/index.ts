/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVICE_PROFILES, pickDeviceProfile } from './device_profiles';
import { EdotReactNativeApp, type EdotReactNativeAppOptions } from './edot_react_native_app';
import { session } from './edot_react_native_session';
import { MOBILE_HEALTH_PROFILES } from './health_profiles';

export type { DeviceProfile, DeviceProfileId, MobilePlatform } from './device_profiles';
export type { MobileHealthProfile } from './health_profiles';
export type { EdotAndroidClient } from './edot_android_client';
export type { EdotIosClient, IosAppState } from './edot_ios_client';
export type {
  EdotReactNativeClient,
  EdotReactNativeClientOptions,
  NetworkConnection,
  NetworkConnectionType,
} from './edot_react_native_client';
export type { EdotReactNativeSpanDocument } from './edot_react_native_span';
export type {
  EdotReactNativeAppModel,
  EdotReactNativeDocument,
  EdotReactNativeEvent,
  EdotReactNativeRequest,
  EdotReactNativeScreen,
  EdotReactNativeSessionOptions,
  EdotReactNativeWidget,
  ManualSpanOptions,
} from './edot_react_native_session';

export const edotReactNative = {
  app: (options: EdotReactNativeAppOptions): EdotReactNativeApp => new EdotReactNativeApp(options),
  session,
  deviceProfiles: DEVICE_PROFILES,
  pickDeviceProfile,
  healthProfiles: MOBILE_HEALTH_PROFILES,
};
