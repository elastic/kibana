/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm, EuiSwitch } from '@elastic/eui';
import React, { FC } from 'react';

interface EmbedModalPageProps {
  allowShortUrl: boolean;
  shareableUrlForSavedObject?: string;
  // radio: boolean;
  // checkbox: boolean;
  // toggle: boolean;
}

export const EmbedModalPage: FC<EmbedModalPageProps> = (props: EmbedModalPageProps) => {
  const { allowShortUrl, shareableUrlForSavedObject } = props;

  const onChangeHandler = () => {};
  return (
    <EuiForm className="kbnShareContextMenu__finalPanel">
      {allowShortUrl && (
        <EuiSwitch label={'Shorten Url'} checked={false} onChange={onChangeHandler} />
      )}
    </EuiForm>
  );
};
