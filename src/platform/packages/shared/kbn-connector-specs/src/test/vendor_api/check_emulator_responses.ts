/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { createEmulatorFetch } from '@kbn/connector-emulate';
import type { RejectedResponse } from '@kbn/connector-emulate';
import { readResponseFixtures } from './load_responses';
import { loadVendorSpecs, readOptional, SILENT_LOG } from './load_vendor_specs';

/** The realistic responses the Scout suites make the emulator answer with, in `vendor_api`. */
export const EMULATOR_RESPONSES = 'emulator_responses.json';

const offline = async (url: string): Promise<string> => {
  throw new Error(`The specs in the folder are enough, but ${url} was requested`);
};

const describeRejected = ({ operation, violations }: RejectedResponse): string =>
  `${operation}: ${violations.map(({ message }) => message).join('; ')}`;

/**
 * What in a connector's `emulator_responses.json` doesn't fit the vendor specs in the same folder,
 * one line per response the emulator rejects, or the reason the file or the specs couldn't be
 * read. Empty when the folder has no such file, or all of it fits.
 *
 * @param directory a connector's `vendor_api` folder
 */
export const checkEmulatorResponses = async (directory: string): Promise<string[]> => {
  const file = path.join(directory, EMULATOR_RESPONSES);
  if ((await readOptional(file)) === undefined) {
    return [];
  }
  try {
    const { specs, pagination } = await loadVendorSpecs({
      directory,
      fetchText: offline,
      log: SILENT_LOG,
    });
    // The way the Scout suites set them: the emulator serves the fixtures it starts with as written,
    // but checks the ones set while it runs, and drops all of them if one doesn't fit.
    const rejected = createEmulatorFetch({ specs, pagination }).runtimeFixtures.set(
      await readResponseFixtures(file)
    );
    return rejected.map(describeRejected);
  } catch (error) {
    return [`${EMULATOR_RESPONSES}: ${error instanceof Error ? error.message : String(error)}`];
  }
};
