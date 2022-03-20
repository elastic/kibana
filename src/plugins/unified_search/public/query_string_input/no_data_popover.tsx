/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
            {i18n.translate('unifiedSearch.noDataPopover.content', {
              defaultMessage:
                "This time range doesn't contain any data. Increase or adjust the time range to see more fields and create charts.",
            })}
          </p>
        </EuiText>
      }
      minWidth={300}
      anchorPosition="downCenter"
      anchorClassName="eui-displayBlock"
      step={1}
      stepsTotal={1}
      isStepOpen={noDataPopoverVisible}
      subtitle={i18n.translate('unifiedSearch.noDataPopover.subtitle', { defaultMessage: 'Tip' })}
      title={i18n.translate('unifiedSearch.noDataPopover.title', {
        defaultMessage: 'Empty dataset',
      })}
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
          {i18n.translate('unifiedSearch.noDataPopover.dismissAction', {
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
