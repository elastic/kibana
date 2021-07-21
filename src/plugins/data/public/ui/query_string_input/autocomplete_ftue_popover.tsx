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
  storage,
  children,
}: {
  storage: IStorageWrapper;
  children: ReactElement;
}) {
  const [autocompleteFtuePopoverDismissed, setAutocompleteFtuePopoverDismissed] = useState(() =>
    Boolean(storage.get(AUTOCOMPLETE_FTUE_POPOVER_STORAGE_KEY))
  );
  const [autocompleteFtuePopoverVisible, setAutocompleteFtuePopoverVisible] = useState(false);

  useEffect(() => {
    if (!autocompleteFtuePopoverDismissed) {
      setAutocompleteFtuePopoverVisible(true);
    }
  }, [autocompleteFtuePopoverDismissed]);

  return (
    <EuiTourStep
      onFinish={() => {}}
      closePopover={() => {
        setAutocompleteFtuePopoverVisible(false);
      }}
      content={
        <EuiText size="s">
          <p style={{ maxWidth: 300 }}>
            {i18n.translate('data.autocompleteFtuePopover.content', {
              defaultMessage:
                'The way we query for value suggestions in autocomplete has changed. We now use the terms enum API in Elasticsearch for improved  performance, though results will not always completely reflect the selected time range, and will not be sorted by popularity. To revert to the old behavior of using a terms aggregation, go to Advanced Settings and set autocomplete:valueSuggestionMethod to "terms_agg".',
            })}
          </p>
        </EuiText>
      }
      minWidth={300}
      anchorPosition="downCenter"
      anchorClassName="eui-displayBlock"
      step={1}
      stepsTotal={1}
      isStepOpen={autocompleteFtuePopoverVisible}
      subtitle={i18n.translate('data.autocompleteFtuePopover.subtitle', { defaultMessage: 'Tip' })}
      title={i18n.translate('data.autocompleteFtuePopover.title', {
        defaultMessage: 'Autocomplete changes',
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
