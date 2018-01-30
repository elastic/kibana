import React from 'react';
import { render, mount } from 'enzyme';
import { MarkdownVisWrapper } from './markdown_vis_controller';

describe('markdown vis controller', () => {
  it('should set html from markdown params', () => {
    const vis = {
      params: {
        markdown: 'This is a test of the [markdown](http://daringfireball.net/projects/markdown) vis.'
      }
    };

    const wrapper = render(<MarkdownVisWrapper vis={vis} />);
    expect(wrapper.find('a').text()).toBe('markdown');
  });

  it('should not render the html', () => {
    const vis = {
      params: {
        markdown: 'Testing <a>html</a>'
      }
    };

    const wrapper = render(<MarkdownVisWrapper vis={vis} />);
    expect(wrapper.text()).toBe('Testing <a>html</a>\n');
  });

  it('should update the HTML when render again with changed params', () => {
    const vis = {
      params: {
        markdown: 'Initial'
      }
    };

    const wrapper = mount(<MarkdownVisWrapper vis={vis} />);
    expect(wrapper.text().trim()).toBe('Initial');
    vis.params.markdown = 'Updated';
    wrapper.setProps({ vis });
    expect(wrapper.text().trim()).toBe('Updated');
  });
});
