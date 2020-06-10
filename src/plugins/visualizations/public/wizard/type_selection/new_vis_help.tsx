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
import React, { Fragment } from 'react';
import { EuiText, EuiButton } from '@elastic/eui';
import { VisTypeAliasListEntry } from './type_selection';
import { VisTypeAlias } from '../../vis_types';

interface Props {
  promotedTypes: VisTypeAliasListEntry[];
  onPromotionClicked: (visType: VisTypeAlias) => void;
}

export function NewVisHelp(props: Props) {
  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="visualizations.newVisWizard.helpText"
          defaultMessage="Start creating your visualization by selecting a type for that visualization."
        />
      </p>
      {props.promotedTypes.map((t) => (
        <Fragment key={t.name}>
          <p>
            <strong>{t.promotion!.description}</strong>
          </p>
          <EuiButton
            onClick={() => props.onPromotionClicked(t)}
            fill
            size="s"
            iconType="popout"
            iconSide="right"
          >
            {t.promotion!.buttonText}
          </EuiButton>
        </Fragment>
      ))}
    </EuiText>
  );
}
