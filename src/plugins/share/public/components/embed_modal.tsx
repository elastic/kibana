/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm, EuiFormHelpText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { UrlParamExtension } from '../types';

interface EmbedProps {
  urlParamExtensions?: UrlParamExtension[];
}

export const EmbedModal = ({ urlParamExtensions }: EmbedProps) => {
  const renderUrlParamExtensions = () => {
    if (!urlParamExtensions) {
      return;
    }

    const setParamValue =
      (paramName: string) =>
      (values: { [queryParam: string]: boolean } = {}): void => {
        //   const stateUpdate = {
        //     urlParams: {
        //       ...this.state.urlParams,
        //       [paramName]: {
        //         ...values,
        //       },
        //     },
        //   };
        //   this.setState(stateUpdate, this.state.useShortUrl ? this.createShortUrl : this.setUrl);
      };

    return (
      <React.Fragment>
        {urlParamExtensions.map(({ paramName, component: UrlParamComponent }) => (
          <EuiFormRow key={paramName}>
            <UrlParamComponent setParamValue={setParamValue(paramName)} />
          </EuiFormRow>
        ))}
      </React.Fragment>
    );
  };
  return (
    <EuiForm>
      <EuiSpacer size="s" />
      <EuiFormHelpText>
        <FormattedMessage
          id="share.embed.helpText"
          defaultMessage="Embed this dashboard into another webpage. Select which items to include in the embeddable view."
        />
      </EuiFormHelpText>
      <EuiSpacer />
      {renderUrlParamExtensions()}
    </EuiForm>
  );
};
