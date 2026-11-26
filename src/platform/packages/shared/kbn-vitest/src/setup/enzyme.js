/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest counterpart of @kbn/jest's src/setup/enzyme.js and the jsdom preset's snapshotSerializers.

import { afterAll, expect, vi } from 'vitest';
import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { createSerializer } from '@emotion/jest';
import { replaceEmotionPrefix } from '@elastic/eui/lib/test';
import enzymeToJsonSerializer from 'enzyme-to-json/serializer';
import enzymeEmotionSerializer from '@kbn/jest/src/setup/enzyme_emotion_serializer';
import * as reactMountSerializer from '@kbn/jest/src/setup/react_mount_serializer';

configure({ adapter: new Adapter() });

// Jest applies `snapshotSerializers` first to last; each `addSnapshotSerializer` call takes
// precedence over earlier ones, so register them in reverse.
expect.addSnapshotSerializer(
  createSerializer({ classNameReplacer: replaceEmotionPrefix, includeStyles: false })
);
expect.addSnapshotSerializer(enzymeEmotionSerializer);
expect.addSnapshotSerializer(enzymeToJsonSerializer);
expect.addSnapshotSerializer(reactMountSerializer);

// Jest drops errors thrown after the environment is torn down; Vitest reports them. Unmount every
// enzyme root once the file is done so EUI timers can't fire into a dead jsdom.
const mountedWrappers = vi.hoisted(() => new Set());
afterAll(() => {
  mountedWrappers.forEach((wrapper) => wrapper.length && wrapper.unmount());
  mountedWrappers.clear();
});

vi.mock('enzyme', async (importOriginal) => {
  const imported = await importOriginal();
  const actual = imported.default ?? imported;
  const { muteLegacyRootWarning } = await import('@kbn/react-mute-legacy-root-warning');
  // React 18 inserts emotion styles in useInsertionEffect, which enzyme's `render` never runs;
  // the serializer needs the style tag to replace emotion class names.
  const ensureEmotionStyleTag = () => {
    if (!document.head.querySelector('style[data-emotion]')) {
      const style = document.createElement('style');
      style.setAttribute('data-emotion', 'css');
      document.head.appendChild(style);
    }
  };
  const enzyme = {
    ...actual,
    render: (node, options) => {
      ensureEmotionStyleTag();
      return actual.render(node, options);
    },
    mount: (node, options) => {
      const unmute = muteLegacyRootWarning();
      try {
        const wrapper = actual.mount(node, options);
        mountedWrappers.add(wrapper);
        return wrapper;
      } finally {
        unmute();
      }
    },
  };
  return { ...enzyme, default: enzyme };
});
