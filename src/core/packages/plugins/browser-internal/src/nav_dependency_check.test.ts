/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';
import { createNavDependencyReporter } from './nav_dependency_check';

describe('createNavDependencyReporter', () => {
  // Opaque ids for the plugins that own apps in these tests.
  const discoverOwner = Symbol('discover');
  const transformOwner = Symbol('transform');
  const callerOwner = Symbol('securitySolution');

  const appOwners: Record<string, PluginOpaqueId> = {
    discover: discoverOwner,
    transform: transformOwner,
    myOwnApp: callerOwner,
  };

  const opaqueIdToPluginId = new Map<PluginOpaqueId, PluginName>([
    [discoverOwner, 'discover'],
    [transformOwner, 'transform'],
    [callerOwner, 'securitySolution'],
  ]);

  let logger: jest.Mocked<Pick<Logger, 'warn'>>;

  const createReporter = () =>
    createNavDependencyReporter({
      getAppOwner: (appId) => appOwners[appId],
      opaqueIdToPluginId,
      logger: logger as unknown as Logger,
    });

  beforeEach(() => {
    logger = { warn: jest.fn() };
  });

  it('warns when a plugin navigates to another plugin app it does not declare', () => {
    const report = createReporter();

    report('securitySolution', new Set(), 'discover');

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('securitySolution');
    expect(logger.warn.mock.calls[0][0]).toContain('discover');
  });

  it('does not warn when the owning plugin is a declared dependency', () => {
    const report = createReporter();

    report('securitySolution', new Set(['discover']), 'discover');

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn when a plugin navigates within its own app', () => {
    const report = createReporter();

    report('securitySolution', new Set(), 'myOwnApp');

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('resolves the owner from a deep-link target of the form "appId:deepLinkId"', () => {
    const report = createReporter();

    report('securitySolution', new Set(), 'transform:my_deep_link');

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('transform');
  });

  it('does not warn when the target app has no known owner (e.g. a Core app)', () => {
    const report = createReporter();

    report('securitySolution', new Set(), 'unknownApp');

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reports each undeclared caller -> owner edge only once', () => {
    const report = createReporter();

    report('securitySolution', new Set(), 'discover');
    report('securitySolution', new Set(), 'discover');
    report('securitySolution', new Set(), 'discover:some_deep_link');

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
