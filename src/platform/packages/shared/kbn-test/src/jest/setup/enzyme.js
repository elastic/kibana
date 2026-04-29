/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

configure({ adapter: new Adapter() });

/* eslint-env jest */

/**
 * This is a workaround to fix snapshot serialization of emotion classes when rendering React@18 using `import { render } from 'enzyme'`
 * With React@18 emotion uses `useInsertionEffect` to insert styles into the DOM, which enzyme `render` does not trigger because it is using ReactDomServer.renderToString.
 * With React@17 emotion fell back to sync cb, so it was working with enzyme `render`.
 * Without those styles in DOM the custom snapshot serializer is not able to replace the emotion class names.
 * This workaround ensures a fake emotion style tag is present in the DOM before rendering the component with enzyme making the snapshot serializer work.
 */
function mockEnsureEmotionStyleTag() {
  if (!document.head.querySelector('style[data-emotion]')) {
    const style = document.createElement('style');
    style.setAttribute('data-emotion', 'css');
    document.head.appendChild(style);
  }
}

jest.mock('enzyme', () => {
  const actual = jest.requireActual('enzyme');
  return {
    ...actual,
    render: (node, options) => {
      mockEnsureEmotionStyleTag();
      return actual.render(node, options);
    },
    mount: (node, options) => {
      // Since we're using React 17 enzyme adapter, we need to mute the warning about using legacy root API
      // Otherwise console will be flooded with warnings
      const unmute = require('@kbn/react-mute-legacy-root-warning').muteLegacyRootWarning();
      try {
        return actual.mount(node, options);
      } finally {
        unmute();
      }
    },
  };
});
