/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { MarkdownVisParams } from './types';
import { MarkdownOptions } from './markdown_options';

describe('MarkdownOptions', () => {
  const props = ({
    stateParams: {
      fontSize: 12,
      markdown: 'hello from 2020 🥳',
      openLinksInNewTab: false,
    },
    setValue: jest.fn(),
  } as unknown) as VisOptionsProps<MarkdownVisParams>;

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
