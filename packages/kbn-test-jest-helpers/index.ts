/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './src/enzyme_helpers';

export * from './src/find_test_subject';

export * from './src/jsdom_svg_mocks';

export * from './src/random';

export * from './src/redux_helpers';

export * from './src/router_helpers';

export * from './src/stub_broadcast_channel';

export * from './src/stub_browser_storage';

export * from './src/stub_web_worker';

export * from './src/testbed';

export * from './src/axe_helpers';

export const nextTick = () => new Promise((res) => process.nextTick(res));

export const delay = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));
