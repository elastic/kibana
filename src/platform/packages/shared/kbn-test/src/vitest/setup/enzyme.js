/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vitest counterpart of src/jest/setup/enzyme.js.

import { afterAll, vi } from 'vitest';
import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { muteLegacyRootWarning } from '@kbn/react-mute-legacy-root-warning';

configure({ adapter: new Adapter() });

const ensureEmotionStyleTag = () => {
  if (!document.head.querySelector('style[data-emotion]')) {
    const style = document.createElement('style');
    style.setAttribute('data-emotion', 'css');
    document.head.appendChild(style);
  }
};

// Jest discards errors thrown after an environment is torn down; Vitest reports them. Unmount
// every enzyme root once the file is done so EUI timers cannot fire into a dead jsdom. (Not per
// test: suites mount in beforeAll and assert across tests.)
const mountedWrappers = vi.hoisted(() => new Set());
afterAll(() => {
  // A root wrapper has length 0 once the test unmounted it itself.
  mountedWrappers.forEach((wrapper) => wrapper.length && wrapper.unmount());
  mountedWrappers.clear();
});

vi.mock('enzyme', async (importOriginal) => {
  const imported = await importOriginal();
  // enzyme is CommonJS without statically detectable exports; everything lives on `default`.
  const actual = imported.default ?? imported;
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
