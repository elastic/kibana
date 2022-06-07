/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiLink,
} from '@elastic/eui';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider, Markdown } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { Embeddable } from './embeddable';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { IContainer } from '../containers';
import { getTheme } from '../../services';

export const ERROR_EMBEDDABLE_TYPE = 'error';

export function isErrorEmbeddable<TEmbeddable extends IEmbeddable>(
  embeddable: TEmbeddable | ErrorEmbeddable
): embeddable is ErrorEmbeddable {
  return Boolean(embeddable.fatalError || (embeddable as ErrorEmbeddable).error !== undefined);
}

export class ErrorEmbeddable extends Embeddable<EmbeddableInput, EmbeddableOutput> {
  public readonly type = ERROR_EMBEDDABLE_TYPE;
  public error: Error | string;
  private dom?: HTMLElement;

  constructor(
    error: Error | string,
    input: EmbeddableInput,
    parent?: IContainer,
    private compact: boolean = false
  ) {
    super(input, {}, parent);
    this.error = error;
  }

  public reload() {}

  public render(dom: HTMLElement) {
    const title = typeof this.error === 'string' ? this.error : this.error.message;
    this.dom = dom;
    let theme;
    try {
      theme = getTheme();
    } catch (err) {
      theme = {};
    }
    const errorMarkdown = (
      <Markdown markdown={title} openLinksInNewTab={true} data-test-subj="errorMessageMarkdown" />
    );

    const node = this.compact ? (
      <CompactEmbeddableError>{errorMarkdown}</CompactEmbeddableError>
    ) : (
      <div className="embPanel__error embPanel__content" data-test-subj="embeddableStackError">
        <EuiText color="subdued" size="xs">
          <EuiIcon type="alert" color="danger" />
          <EuiSpacer size="s" />
          {errorMarkdown}
        </EuiText>
      </div>
    );
    const content =
      theme && theme.theme$ ? (
        <KibanaThemeProvider theme$={theme.theme$}>{node}</KibanaThemeProvider>
      ) : (
        node
      );

    ReactDOM.render(content, dom);
  }

  public destroy() {
    if (this.dom) {
      ReactDOM.unmountComponentAtNode(this.dom);
    }
  }
}

const CompactEmbeddableError = ({ children }: { children?: React.ReactNode }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const popoverButton = (
    <EuiLink onClick={() => setPopoverOpen((open) => !open)}>
      {i18n.translate('embeddableApi.panel.errorEmbeddable.learnMore', {
        defaultMessage: 'Learn more.',
      })}
    </EuiLink>
  );

  return (
    <EuiFlexGroup
      style={{ height: '100%', whiteSpace: 'nowrap' }}
      gutterSize="none"
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="alert" color="danger" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          <p>
            {i18n.translate('embeddableApi.panel.errorEmbeddable.errorText', {
              defaultMessage: 'A fatal error has occurred.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPopover
          button={popoverButton}
          isOpen={isPopoverOpen}
          closePopover={() => setPopoverOpen(false)}
        >
          {children}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
