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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  onClick: () => void;
  disabled?: boolean;
  scripted?: boolean;
}

export function DocViewTableRowBtnFilterExists({
  onClick,
  disabled = false,
  scripted = false,
}: Props) {
  if (disabled) {
    return (
      <EuiToolTip
        content={
          scripted ? (
            <FormattedMessage
              id="kbnDocViews.table.unableToFilterForPresenceOfScriptedFieldsTooltip"
              defaultMessage="Unable to filter for presence of scripted fields"
            />
          ) : (
            <FormattedMessage
              id="kbnDocViews.table.unableToFilterForPresenceOfMetaFieldsTooltip"
              defaultMessage="Unable to filter for presence of meta fields"
            />
          )
        }
      >
        <span className="kbnDocViewer__actionButton">
          <i className="fa fa-asterisk text-muted" />
        </span>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="kbnDocViews.table.filterForFieldPresentButtonTooltip"
          defaultMessage="Filter for field present"
        />
      }
    >
      <button
        onClick={onClick}
        className="kbnDocViewer__actionButton"
        aria-label={i18n.translate('kbnDocViews.table.filterForFieldPresentButtonAriaLabel', {
          defaultMessage: 'Filter for field present',
        })}
      >
        <i className="fa fa-asterisk" />
      </button>
    </EuiToolTip>
  );
}
