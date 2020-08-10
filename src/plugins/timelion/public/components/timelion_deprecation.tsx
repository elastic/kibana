/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';
import { DocLinksStart } from '../../../../core/public';

export const TimelionDeprecation = ({ links }: DocLinksStart) => {
  const timelionDeprecationLink = links.visualize.timelionDeprecation;
  return (
    <>
      <EuiCallOut
        title={i18n.translate('timelion.deprecation.notice', {
          defaultMessage: 'Deprecation notice',
        })}
        color="warning"
        iconType="help"
      >
        <FormattedMessage
          id="timelion.deprecation.message"
          defaultMessage="Timelion app is deprecated and will be removed on 8.0+. Click {timeLionDeprecationLink} to check the actions you can take to copy your existing Timelion worksheets to a
              dashboard."
          values={{
            timeLionDeprecationLink: (
              <EuiLink href={timelionDeprecationLink} target="_blank">
                <FormattedMessage id="timelion.deprecation.here" defaultMessage="here" />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
