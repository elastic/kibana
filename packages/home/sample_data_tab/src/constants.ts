/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Corresponds to src/plugins/home/server/services/sample_data/routes
export const URL_SAMPLE_DATA_API = '/api/sample_data';

// TODO: clintandrewhall pull from config
export const URL_DEMO_ENV = 'https://ela.st/demo';

/**
 * Test Subject name for the Demo Environment button.
 */
export const DATA_TEST_SUBJ_DEMO_ENV_BUTTON = 'goToDemoEnvButton';

/**
 * Test Subject name for the sample data accordion button.
 */
export const DATA_TEST_SUBJ_SHOW_SAMPLE_DATA_BUTTON = 'showSampleDataButton';

/**
 * Test Subject name for the sample data accordion button.
 */
export const DATA_TEST_SUBJ_SHOW_SAMPLE_DATA_ACCORDION = 'showSampleDataAccordion';

/**
 * Metric name for counting number of clicks of the Demo Environment button.
 */
export const METRIC_CLICK_DEMO_ENV_BUTTON = 'sample_data__demo_env_button';

/**
 * Metric name for counting number of clicks of the sample data accordion button.
 */
export const METRIC_CLICK_SHOW_SAMPLE_DATA_BUTTON = 'sample_data__show_sample_data_button';
