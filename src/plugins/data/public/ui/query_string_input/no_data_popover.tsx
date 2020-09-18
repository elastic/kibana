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

import { ReactElement, useEffect, useState } from 'react';
import React from 'react';
import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { i18n } from '@kbn/i18n';

const NO_DATA_POPOVER_STORAGE_KEY = 'data.noDataPopover';

export function NoDataPopover({
  showNoDataPopover,
  storage,
  children,
}: {
  showNoDataPopover?: boolean;
  storage: IStorageWrapper;
  children: ReactElement;
}) {
  const [noDataPopoverDismissed, setNoDataPopoverDismissed] = useState(() =>
    Boolean(storage.get(NO_DATA_POPOVER_STORAGE_KEY))
  );
  const [noDataPopoverVisible, setNoDataPopoverVisible] = useState(false);

  useEffect(() => {
    if (showNoDataPopover && !noDataPopoverDismissed) {
      setNoDataPopoverVisible(true);
    }
  }, [noDataPopoverDismissed, showNoDataPopover]);

  return (
    <EuiTourStep
      onFinish={() => {}}
      closePopover={() => {
        setNoDataPopoverVisible(false);
      }}
      content={
        <EuiText size="s">
          <p style={{ maxWidth: 300 }}>
            {i18n.translate('data.noDataPopover.content', {
              defaultMessage:
                "This time range doesn't contain any data. Increase or adjust the time range to see more fields and create charts.",
            })}
          </p>
        </EuiText>
      }
      minWidth={300}
      anchorPosition="downCenter"
      step={1}
      stepsTotal={1}
      isStepOpen={noDataPopoverVisible}
      subtitle={i18n.translate('data.noDataPopover.subtitle', { defaultMessage: 'Tip' })}
      title={i18n.translate('data.noDataPopover.title', { defaultMessage: 'Empty dataset' })}
      footerAction={
        <EuiButtonEmpty
          size="xs"
          flush="right"
          color="text"
          data-test-subj="noDataPopoverDismissButton"
          onClick={() => {
            storage.set(NO_DATA_POPOVER_STORAGE_KEY, true);
            setNoDataPopoverDismissed(true);
            setNoDataPopoverVisible(false);
          }}
        >
          {i18n.translate('data.noDataPopover.dismissAction', {
            defaultMessage: "Don't show again",
          })}
        </EuiButtonEmpty>
      }
    >
      <div
        onFocus={() => {
          setNoDataPopoverVisible(false);
        }}
      >
        {children}
      </div>
    </EuiTourStep>
  );
}
