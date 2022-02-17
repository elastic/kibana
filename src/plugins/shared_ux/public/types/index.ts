/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import { FC } from 'react';

/** @internal */
export interface SharedUXPluginSetup {}

/**
 * The Shared UX plugin public contract, containing prewired components, services, and
 * other constructs useful to consumers.
 */
export interface SharedUXPluginStart {
  /**
   * A React component that provides a pre-wired `React.Context` which connects components to Shared UX services.
   */
  ServicesContext: FC<{}>;
}

/** @internal */
export interface SharedUXPluginSetupDeps {}

/** @internal */
export interface SharedUXPluginStartDeps {}
