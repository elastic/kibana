import React from 'react';
import { render } from 'enzyme';
import { MarkdownVisComponent } from './markdown_vis_controller';

describe('markdown vis controller', () => {
  it('should set html from markdown params', () => {
    const vis = {
      params: {
        markdown: 'This is a test of the [markdown](http://daringfireball.net/projects/markdown) vis.'
      }
    };

    const wrapper = render(<MarkdownVisComponent vis={vis} />);
    expect(wrapper.find('a').text()).toBe('markdown');
  });

  it('should not render the html', () => {
    const vis = {
      params: {
        markdown: 'Testing <a>html</a>'
      }
    };

    const wrapper = render(<MarkdownVisComponent vis={vis} />);
    expect(wrapper.text()).toBe('Testing <a>html</a>\n');
  });
});
