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

/*
 * The UI and related logic for the welcome screen that *should* show only
 * when it is enabled (the default) and there is no Kibana-consumed data
 * in Elasticsearch.
 */

import React from 'react';
import {
  // @ts-ignore
  EuiCard,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  urlBasePath: string;
  onDecline: () => void;
  onConfirm: () => void;
}

export function SampleDataCard({ urlBasePath, onDecline, onConfirm }: Props) {
  return (
    <EuiCard
      image={`${urlBasePath}/plugins/home/assets/illustration_elastic_heart.png`}
      textAlign="left"
      title={<FormattedMessage id="home.letsStartTitle" defaultMessage="Let's get started" />}
      description={
        <FormattedMessage
          id="home.letsStartDescription"
          defaultMessage="We noticed that you don't have any data in your cluster.
You can try our sample data and dashboards or jump in with your own data."
        />
      }
      footer={
        <footer>
          <EuiButton fill className="homWelcome__footerAction" onClick={onConfirm}>
            <FormattedMessage id="home.tryButtonLabel" defaultMessage="Try our sample data" />
          </EuiButton>
          <EuiButtonEmpty
            className="homWelcome__footerAction"
            onClick={onDecline}
            data-test-subj="skipWelcomeScreen"
          >
            <FormattedMessage id="home.exploreButtonLabel" defaultMessage="Explore on my own" />
          </EuiButtonEmpty>
        </footer>
      }
    />
  );
}
