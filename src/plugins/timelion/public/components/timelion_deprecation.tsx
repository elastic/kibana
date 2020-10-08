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
