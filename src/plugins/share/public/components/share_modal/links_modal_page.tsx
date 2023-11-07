/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCodeBlock, EuiForm, EuiIcon, EuiSpacer } from '@elastic/eui';
import React, { FC } from 'react';

interface LinksModalPageProps {
  isEmbedded: boolean;
  allowShortUrl: boolean;
  objectType: string;

}

const renderRadioButtons = () => {

}

export const LinksModalPage: FC<LinksModalPageProps> = (props: LinksModalPageProps) => {
//   const { isEmbedded, allowShortUrl, objectType } = props;
  return ( //<Frame isEmbedded={isEmbedded} allowShortUrl={allowShortUrl} objectType={objectType} />
  <EuiForm>
  {renderRadioButtons()}
  <EuiSpacer />
  <EuiCodeBlock isCopyable>
    <EuiIcon type="copy"/>
    </EuiCodeBlock>
  </EuiForm>
  );
};
