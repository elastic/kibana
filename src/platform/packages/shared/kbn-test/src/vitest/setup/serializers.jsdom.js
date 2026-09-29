/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest counterpart of `snapshotSerializers` in jest-preset.js. Each added serializer takes
// precedence over the previous ones, so they are added in reverse order of the Jest list.

import { expect } from 'vitest';
import { createSerializer } from '@emotion/jest';
import { replaceEmotionPrefix } from '@elastic/eui/lib/test';
import enzymeToJsonSerializer from 'enzyme-to-json/serializer';
import enzymeEmotionSerializer from '../../jest/setup/enzyme_emotion_serializer';

// Same as @kbn/react-kibana-mount/test_helpers/react_mount_serializer, which kbn-test cannot import.
const reactMountSerializer = {
  test: (value) => Boolean(value && value.__reactMount__),
  print: (value, serialize) =>
    serialize({ reactNode: value.__reactMount__ }).replace('Object', 'MountPoint'),
};

expect.addSnapshotSerializer(
  createSerializer({ classNameReplacer: replaceEmotionPrefix, includeStyles: false })
);
expect.addSnapshotSerializer(enzymeEmotionSerializer);
expect.addSnapshotSerializer(enzymeToJsonSerializer);
expect.addSnapshotSerializer(reactMountSerializer);
