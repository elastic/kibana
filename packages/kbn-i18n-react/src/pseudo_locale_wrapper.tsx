/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as PropTypes from 'prop-types';
import * as React from 'react';
import { i18n } from '@kbn/i18n';

/**
 * To translate label that includes nested `FormattedMessage` instances React Intl
 * replaces them with special placeholders (@__uid__@ELEMENT-uid-counter@__uid__@)
 * and maps them back with nested translations after `formatMessage` processes
 * original string, so we shouldn't modify these special placeholders with pseudo
 * translations otherwise React Intl won't be able to properly replace placeholders.
 * It's implementation detail of the React Intl, but since pseudo localization is dev
 * only feature we should be fine here.
 * @param message
 */
function translateFormattedMessageUsingPseudoLocale(message: string) {
  const formattedMessageDelimiter = message.match(/@__.{10}__@/);
  if (formattedMessageDelimiter !== null) {
    return message
      .split(formattedMessageDelimiter[0])
      .map((part) => (part.startsWith('ELEMENT-') ? part : i18n.translateUsingPseudoLocale(part)))
      .join(formattedMessageDelimiter[0]);
  }

  return i18n.translateUsingPseudoLocale(message);
}

/**
 * If the locale is our pseudo locale (e.g. en-xa), we override the
 * intl.formatMessage function to display scrambled characters. We are
 * overriding the context rather than using injectI18n, because the
 * latter creates a new React component, which causes React diffs to
 * be inefficient in some cases, and can cause React hooks to lose
 * their state.
 */
export class PseudoLocaleWrapper extends React.PureComponent {
  public static propTypes = { children: PropTypes.element.isRequired };

  public static contextTypes = {
    intl: PropTypes.object.isRequired,
  };

  constructor(props: { children: React.ReactNode }, context: any) {
    super(props, context);

    if (i18n.isPseudoLocale(i18n.getLocale())) {
      const formatMessage = context.intl.formatMessage;
      context.intl.formatMessage = (...args: any[]) =>
        translateFormattedMessageUsingPseudoLocale(formatMessage(...args));
    }
  }

  public render() {
    return this.props.children;
  }
}
