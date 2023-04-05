/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { PropsWithChildren } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { DocsContainer, DocsContainerProps } from '@storybook/addon-docs';
import { css } from '@emotion/react';

import {
  EuiAccordion,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiProvider,
  htmlIdGenerator,
} from '@elastic/eui';

import { theme } from '@kbn/shared-ux-storybook-theme';

import { Page } from '../page';
import type { ElasticMetadata } from '../../types';

export interface ContainerParams {
  children: React.ReactNode;
  context: DocsContainerProps['context'];
}

type P = PropsWithChildren<{}>;

export interface Options {
  title?: string;
  description?: string;
}

const codeIdGenerator = htmlIdGenerator('code');
const CodeBlockLabel = () => (
  <EuiFlexGroup component="span" responsive={false} alignItems="center" gutterSize="s">
    <EuiFlexItem>
      <EuiIcon type="visVega" size="m" />
    </EuiFlexItem>
    <EuiFlexItem component="span" grow={false}>
      Code Block
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface AnchoredElementProps extends P {
  as?: keyof JSX.IntrinsicElements;
  id?: string;
}

const AnchoredElement = ({ as: Component = 'p', children, ...props }: AnchoredElementProps) => {
  const { euiTheme } = useEuiTheme();
  const anchoredCSS = css`
    margin-left: -${euiTheme.size.xl};
  `;
  if (!props.id && typeof children === 'string') {
    props.id = children.toLowerCase().replace(/ /g, '-');
  }
  return (
    <Component {...props} style={{ position: 'relative' }} data-test-subj="anchored-element">
      <EuiFlexGroup gutterSize="s" css={anchoredCSS}>
        <EuiFlexItem grow={false}>
          <EuiLink href={`#${props.id}`} aria-label={`${children} permalink`}>
            <EuiIcon type="link" />
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </Component>
  );
};

const isElasticMetadata = (
  metadata: ElasticMetadata | Record<string, unknown> | undefined
): metadata is ElasticMetadata => {
  return !!(metadata && metadata.id && metadata.slug && metadata.title);
};

export const getMetaElementParameters = (
  metadata: ElasticMetadata | Record<string, unknown> | undefined,
  page?: (props: any) => JSX.Element
) => {
  if (!isElasticMetadata(metadata)) {
    return {};
  }

  return {
    options: {
      showToolbar: !!page,
    },
    docs: {
      theme,
      container: ({ children, context }: ContainerParams) => (
        <DocsContainer context={context}>
          <EuiProvider>
            <Page {...{ metadata }}>{children}</Page>
          </EuiProvider>
        </DocsContainer>
      ),
      page,
      components: {
        a: EuiLink,
        h1: ({ children }: P) => (metadata.title ? null : <h1>{children}</h1>),
        h2: (props: P) => <AnchoredElement as="h2" {...props} />,
        h3: (props: P) => <AnchoredElement as="h3" {...props} />,
        h4: (props: P) => <AnchoredElement as="h4" {...props} />,
        h5: (props: P) => <AnchoredElement as="h5" {...props} />,
        h6: (props: P) => <AnchoredElement as="h6" {...props} />,
        p: ({ children }: P) => <p>{children}</p>,
        li: ({ children }: P) => <li>{children}</li>,
        ul: ({ children }: P) => <ul>{children}</ul>,
        ol: ({ children }: P) => <ol>{children}</ol>,
        // Lifted from https://github.com/elastic/eui/blob/main/src/components/markdown_editor/plugins/markdown_default_plugins/processing_plugins.tsx
        code: (props: any) => {
          const language =
            props.className && props.className.includes('language-')
              ? props.className.replace('language-', '')
              : 'text';

          if (
            /\r|\n/.exec(props.children) ||
            (props.className && props.className.indexOf('remark-prismjs--fenced') > -1)
          ) {
            return (
              <EuiAccordion
                id={codeIdGenerator()}
                initialIsOpen={true}
                buttonContent={<CodeBlockLabel />}
              >
                <EuiCodeBlock fontSize="m" paddingSize="m" isCopyable {...{ ...props, language }} />
              </EuiAccordion>
            );
          }
          return <EuiCode {...{ ...props, language }} />;
        },
        pre: (props: any) => <div {...props} className="euiMarkdownFormat__codeblockWrapper" />,
        blockquote: (props: any) => (
          <blockquote {...props} className="euiMarkdownFormat__blockquote" />
        ),
        table: (props: any) => <table className="euiMarkdownFormat__table" {...props} />,
        tr: (props: any) => <tr {...props} />,
        td: (props: any) => <td {...props} />,
        th: (props: any) => <th {...props} />,
        hr: (props: any) => <EuiHorizontalRule {...props} />,
        DocAccordion: (props: any) => (
          <>
            <div>{props.children}</div>
          </>
        ),
        DocCallOut: (props: any) => (
          <>
            <div>{props.children}</div>
          </>
        ),
      },
    },
  };
};

export type StorybookMetaParameters = ReturnType<typeof getMetaElementParameters>;
