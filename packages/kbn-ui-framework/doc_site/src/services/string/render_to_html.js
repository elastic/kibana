import React from 'react';

import {
  render,
  configure
} from 'enzyme';

import EnzymeAdapter from 'enzyme-adapter-react-16';

import html from 'html';

configure({ adapter: new EnzymeAdapter() });

export function renderToHtml(componentReference, props = {}) {
  // If there's a failure, just return an empty string. The actual component itself should
  // trip an error boundary in the UI when it fails.
  try {
    // Create the React element, render it and get its HTML, then format it prettily.
    const element = React.createElement(componentReference, props);
    const htmlString = render(element).html();
    return html.prettyPrint(htmlString, {
      indent_size: 2,
      unformatted: [], // Expand all tags, including spans
    });
  } catch(e) {
    return '';
  }
}
