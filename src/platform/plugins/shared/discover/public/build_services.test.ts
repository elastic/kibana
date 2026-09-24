/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, of } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { buildServices } from './build_services';
import {
  CASCADE_LAYOUT_ENABLED_FEATURE_FLAG_KEY,
  IS_ESQL_DEFAULT_FEATURE_FLAG_KEY,
} from './constants';

const build = (getBooleanValue$: CoreStart['featureFlags']['getBooleanValue$']) => {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockImplementation(getBooleanValue$);

  return buildServices({
    core,
    plugins: {
      data: {
        query: { filterManager: {}, timefilter: { timefilter: {} } },
        dataViews: {},
      },
      contentManagement: { client: {} },
      embeddable: {
        getStateTransfer: () => ({ getIncomingEditorState: () => undefined }),
      },
    } as never,
    context: {
      env: { packageInfo: { branch: 'main', version: '0.0.0' } },
      logger: { get: () => ({}) },
    } as never,
    locator: {} as never,
    contextLocator: {} as never,
    singleDocLocator: {} as never,
    history: {} as never,
    urlTracker: {} as never,
    profilesManager: {} as never,
    profileStateRegistry: {} as never,
    ebtManager: {} as never,
  });
};

describe('discoverFeatureFlags', () => {
  it('returns the value emitted during subscribe', () => {
    const services = build((flagName, fallback) =>
      of(
        flagName === CASCADE_LAYOUT_ENABLED_FEATURE_FLAG_KEY
          ? false
          : flagName === IS_ESQL_DEFAULT_FEATURE_FLAG_KEY
          ? true
          : fallback
      )
    );

    expect(services.discoverFeatureFlags.getCascadeLayoutEnabled()).toBe(false);
    expect(services.discoverFeatureFlags.getIsEsqlDefault()).toBe(true);
  });

  it('returns the fallback when the observable emits after subscribe returns', () => {
    const services = build(
      () =>
        new Observable((subscriber) => {
          queueMicrotask(() => subscriber.next(true));
        })
    );

    expect(services.discoverFeatureFlags.getIsEsqlDefault()).toBe(false);
  });
});
