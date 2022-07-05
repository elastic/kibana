/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText, EuiIcon, EuiPopover, EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider, Markdown } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { Embeddable } from './embeddable';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { IContainer } from '../containers';
import { getTheme } from '../../services';
import './error_embedabble.scss';

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
      <div className="embPanel__content" data-test-subj="embeddableStackError">
        <EuiEmptyPrompt
          className="embPanel__error"
          iconType="alert"
          iconColor="danger"
          body={errorMarkdown}
        />
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
    <EuiText className="errorEmbeddableCompact__button" size="xs">
      <EuiLink
        className="eui-textTruncate"
        color="subdued"
        onClick={() => setPopoverOpen((open) => !open)}
      >
        <EuiIcon type="alert" color="danger" />
        {i18n.translate('embeddableApi.panel.errorEmbeddable.message', {
          defaultMessage: 'An error has occurred. Read more',
        })}
      </EuiLink>
    </EuiText>
  );

  return (
    <EuiPopover
      button={popoverButton}
      isOpen={isPopoverOpen}
      anchorClassName="errorEmbeddableCompact__popoverAnchor"
      closePopover={() => setPopoverOpen(false)}
    >
      {children}
    </EuiPopover>
  );
};
