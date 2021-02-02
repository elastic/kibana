/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';
import { DocLinksStart } from '../../../../core/public';

export const TimelionDeprecation = ({ links }: DocLinksStart) => {
  const timelionDeprecationLink = links.visualize.timelionDeprecation;
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="timelion.deprecation.message"
            defaultMessage="Deprecated since 7.0, the Timelion app will be removed in 8.0. To continue using your Timelion worksheets, {timeLionDeprecationLink}."
            values={{
              timeLionDeprecationLink: (
                <EuiLink href={timelionDeprecationLink} target="_blank" external>
                  <FormattedMessage
                    id="timelion.deprecation.here"
                    defaultMessage="migrate them to a dashboard."
                  />
                </EuiLink>
              ),
            }}
          />
        }
        color="warning"
        iconType="alert"
        size="s"
      />
      <EuiSpacer size="s" />
    </>
  );
};
