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

import React, { memo } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const InfoComponent = () => {
  const title = (
    <>
      <FormattedMessage
        id="visualize.experimentalVisInfoText"
        defaultMessage="This visualization is marked as experimental. Have feedback? Please create an issue in"
      />{' '}
      <EuiLink external href="https://github.com/elastic/kibana/issues/new/choose" target="_blank">
        GitHub
      </EuiLink>
      {'.'}
    </>
  );

  return (
    <EuiCallOut
      className="hide-for-sharing"
      data-test-subj="experimentalVisInfo"
      size="s"
      title={title}
      iconType="beaker"
    />
  );
};

export const ExperimentalVisInfo = memo(InfoComponent);
