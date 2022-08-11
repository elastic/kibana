/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { MarkdownVisParams } from './types';
import { MarkdownOptions } from './markdown_options';

describe('MarkdownOptions', () => {
  const props = {
    stateParams: {
      fontSize: 12,
      markdown: 'hello from 2020 🥳',
      openLinksInNewTab: false,
    },
    setValue: jest.fn(),
  } as unknown as VisEditorOptionsProps<MarkdownVisParams>;

  it('should match snapshot', () => {
    const comp = shallow(<MarkdownOptions {...props} />);
    expect(comp).toMatchSnapshot();
  });

  it('should update markdown on change', () => {
    const comp = shallow(<MarkdownOptions {...props} />);
    const value = 'see you in 2021 😎';
    const textArea = comp.find('EuiTextArea');
    const onChange = textArea.prop('onChange');
    onChange?.({
      target: {
        // @ts-expect-error
        value,
      },
    });

    expect(props.setValue).toHaveBeenCalledWith('markdown', value);
  });
});
