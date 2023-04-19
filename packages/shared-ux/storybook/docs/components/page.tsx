/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import moment from 'moment';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

// @ts-expect-error Importing something exotic.
import { euiMarkdownFormatStyles } from '@elastic/eui/es/components/markdown_editor/markdown_format.styles';

import iconType from './assets/iconType';
import type { ElasticMetadata } from '../types';
import { TableOfContents } from './table_of_contents';

export interface Props {
  metadata: ElasticMetadata;
  children: React.ReactNode;
}

const iconProps = { size: 'xxl' as 'xxl' };

export const Page = ({ metadata, children }: Props) => {
  const theme = useEuiTheme();
  const styles = euiMarkdownFormatStyles(theme);
  const cssStyles = [styles.euiMarkdownFormat, styles.m];
  const { description, tags, date, title: pageTitle } = metadata;

  let tagsList: ReactNode | undefined;

  if (tags) {
    tagsList = (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          {tags.map((tag) => (
            <EuiFlexItem grow={false}>
              <EuiBadge iconType="tag">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  const rightSideItems = [
    <EuiFlexGroup gutterSize="s" direction="column" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">Last Updated: {moment(date).format('MMM Do, YYYY')}</EuiText>
      </EuiFlexItem>
      {tagsList}
    </EuiFlexGroup>,
  ];
  return (
    <EuiPageTemplate panelled restrictWidth={true}>
      <EuiPageTemplate.Header
        {...{
          iconType,
          iconProps,
          description,
          pageTitle,
          rightSideItems,
        }}
      />
      <EuiPageTemplate.Section>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText
              css={cssStyles}
              color="default"
              className="euiMarkdownFormat"
              data-test-subj="article-content"
            >
              {children}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TableOfContents />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
