/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiCallOut } from '@elastic/eui';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ShowDebugging } from './show_debugging';

export interface Props {
  payload: {
    error: Error;
  };
}

const strings = {
  getDescription: () =>
    i18n.translate('xpack.canvas.errorComponent.description', {
      defaultMessage: 'Expression failed with the message:',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.errorComponent.title', {
      defaultMessage: 'Whoops! Expression failed',
    }),
};

export const Error: FC<Props> = ({ payload }) => {
  const message = get(payload, 'error.message');

  return (
    <EuiCallOut
      style={{ maxWidth: 500 }}
      color="danger"
      iconType="cross"
      title={strings.getTitle()}
    >
      <p>{message ? strings.getDescription() : ''}</p>
      {message && <p style={{ padding: '0 16px' }}>{message}</p>}

      <ShowDebugging payload={payload} />
    </EuiCallOut>
  );
};

Error.propTypes = {
  payload: PropTypes.object.isRequired,
};
