/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export * from './enzyme_helpers';

export * from './get_url';

export * from './find_test_subject';

export * from './jsdom_svg_mocks';

export * from './random';

export * from './redux_helpers';

export * from './router_helpers';

export * from './stub_browser_storage';

export * from './stub_web_worker';

export * from './testbed';

export const nextTick = () => new Promise((res) => process.nextTick(res));

export const delay = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));
