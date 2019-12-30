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
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/target/types/react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function DocViewTableRowBtnToggleColumn({ onClick, active, disabled = false }: Props) {
  if (disabled) {
    return (
      <EuiButtonIcon
        aria-label={i18n.translate(
          'kbn.discover.docViews.table.toggleColumnInTableButtonAriaLabel',
          {
            defaultMessage: 'Toggle column in table',
          }
        )}
        className="kbnDocViewer__actionButton"
        data-test-subj="toggleColumnButton"
        disabled
        iconType={'tableOfContents'}
        iconSize={'s'}
      />
    );
  }
  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="kbn.discover.docViews.table.toggleColumnInTableButtonTooltip"
          defaultMessage="Toggle column in table"
        />
      }
    >
      <EuiButtonIcon
        aria-label={i18n.translate(
          'kbn.discover.docViews.table.toggleColumnInTableButtonAriaLabel',
          {
            defaultMessage: 'Toggle column in table',
          }
        )}
        aria-pressed={active}
        onClick={onClick}
        className="kbnDocViewer__actionButton"
        data-test-subj="toggleColumnButton"
        iconType={'tableOfContents'}
        iconSize={'s'}
      />
    </EuiToolTip>
  );
}
