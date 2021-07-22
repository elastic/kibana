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

const AUTOCOMPLETE_FTUE_POPOVER_STORAGE_KEY = 'data.autocompleteFtuePopover';

export function AutocompleteFtuePopover({
  isVisible,
  storage,
  children,
}: {
  isVisible?: boolean;
  storage: IStorageWrapper;
  children: ReactElement;
}) {
  const [autocompleteFtuePopoverDismissed, setAutocompleteFtuePopoverDismissed] = useState(() =>
    Boolean(storage.get(AUTOCOMPLETE_FTUE_POPOVER_STORAGE_KEY))
  );
  const [autocompleteFtuePopoverVisible, setAutocompleteFtuePopoverVisible] = useState(false);

  useEffect(() => {
    if (!autocompleteFtuePopoverDismissed && isVisible) {
      setAutocompleteFtuePopoverVisible(true);
    }
  }, [autocompleteFtuePopoverDismissed, isVisible]);

  return (
    <EuiTourStep
      onFinish={() => {}}
      closePopover={() => {
        setAutocompleteFtuePopoverVisible(false);
        setAutocompleteFtuePopoverDismissed(true);
      }}
      content={
        <EuiText size="s">
          <p style={{ maxWidth: 300 }}>
            {i18n.translate('data.autocompleteFtuePopover.content', {
              defaultMessage:
                'We changed how autocomplete works to improve performance. Learn more.',
            })}
          </p>
        </EuiText>
      }
      minWidth={300}
      anchorPosition="downCenter"
      zIndex={4002}
      anchorClassName="eui-displayBlock"
      step={1}
      stepsTotal={1}
      isStepOpen={autocompleteFtuePopoverVisible}
      subtitle={''}
      title={i18n.translate('data.autocompleteFtuePopover.title', {
        defaultMessage: 'Autocomplete is now faster!',
      })}
      footerAction={
        <EuiButtonEmpty
          size="xs"
          flush="right"
          color="text"
          data-test-subj="autocompleteFtuePopoverDismissButton"
          onClick={() => {
            storage.set(AUTOCOMPLETE_FTUE_POPOVER_STORAGE_KEY, true);
            setAutocompleteFtuePopoverDismissed(true);
            setAutocompleteFtuePopoverVisible(false);
          }}
        >
          {i18n.translate('data.autocompleteFtuePopover.dismissAction', {
            defaultMessage: "Don't show again",
          })}
        </EuiButtonEmpty>
      }
    >
      <div
        onFocus={() => {
          setAutocompleteFtuePopoverVisible(false);
        }}
      >
        {children}
      </div>
    </EuiTourStep>
  );
}
