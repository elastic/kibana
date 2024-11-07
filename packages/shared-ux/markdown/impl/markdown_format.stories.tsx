/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { MarkdownStorybookMock, MarkdownStorybookParams } from '@kbn/shared-ux-markdown-mocks';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import mdx from './README.mdx';
import { Markdown } from './markdown';

export default {
  title: 'Markdown/Markdown Format',
  description: 'Component to have EuiMarkdownFormat support to be used for markdown within Kibana',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new MarkdownStorybookMock();
const argTypes = mock.getArgumentTypes();

export const MarkdownStoryComponent = (params: MarkdownStorybookParams) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <Markdown
          {...params}
          readOnly={true}
          markdownContent={'My content in **markdown** format set as the *markdownContent prop*'}
        />
        <Markdown {...params} readOnly={true}>
          {`My content in **markdown** format passed as *children*
            \`openLinksInNewTab\` [test link to open in new tab or not](https://www.elastic.co)
            \`enableTooltipSupport\` !{tooltip[anchor text](Tooltip content)}
            \`validateLinks\` [link with non-standard scheme](testing-testing-this-is-a-non-standatd-scheme://)
           `}
        </Markdown>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

MarkdownStoryComponent.argTypes = argTypes;
