/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { SelectIndexComponentProps } from './types';
import { MigrationCallout } from './migration_callout';
import { isStringTypeIndexPattern } from '../../../../../common/index_patterns_utils';
import { IndexPatternObject } from '../../../../../common/types';
import { getDataStart } from '../../../../services';

type SwitchModePopoverProps = Assign<
  Pick<SelectIndexComponentProps, 'onModeChange' | 'value'>,
  {
    useKibanaIndices: boolean;
  }
>;

export const SwitchModePopover = ({
  onModeChange,
  value,
  useKibanaIndices,
}: SwitchModePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [matchedIndex, setMatchedIndex] = useState<IndexPatternObject>();

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const switchMode = useCallback(() => {
    onModeChange(!useKibanaIndices, matchedIndex);
  }, [onModeChange, matchedIndex, useKibanaIndices]);

  useEffect(() => {
    async function retrieveIndex() {
      const { indexPatterns } = getDataStart();

      if (isStringTypeIndexPattern(value)) {
        const index = (await indexPatterns.find(value)).find((i) => i.title === value);

        if (index) {
          return setMatchedIndex({ id: index.id!, title: index.title });
        }
      }

      setMatchedIndex(undefined);
    }

    retrieveIndex();
  }, [value]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType={'gear'}
          aria-label={i18n.translate(
            'visTypeTimeseries.indexPatternSelect.switchModePopover.areaLabel',
            {
              defaultMessage: 'Configure index pattern selection mode',
            }
          )}
          onClick={onButtonClick}
          data-test-subj="switchIndexPatternSelectionModePopover"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      style={{ height: 'auto' }}
    >
      <div style={{ width: '360px' }}>
        <EuiPopoverTitle>
          {i18n.translate('visTypeTimeseries.indexPatternSelect.switchModePopover.title', {
            defaultMessage: 'Index pattern selection mode',
          })}
        </EuiPopoverTitle>
        <EuiText>
          <FormattedMessage
            id="visTypeTimeseries.indexPatternSelect.switchModePopover.text"
            defaultMessage="An index pattern identifies one or more Elasticsearch indices that you want to explore.
            There are currently two selection modes available: Elasticsearch indices and Kibana
            indices (recommended way)."
          />
        </EuiText>
        <EuiSpacer />
        <EuiSwitch
          name="switch"
          checked={useKibanaIndices}
          label={i18n.translate(
            'visTypeTimeseries.indexPatternSelect.switchModePopover.useKibanaIndices',
            {
              defaultMessage: 'Use Kibana indices?',
            }
          )}
          onChange={switchMode}
          data-test-subj="switchIndexPatternSelectionMode"
        />
        {value && isStringTypeIndexPattern(value) && (
          <MigrationCallout value={value} switchMode={switchMode} matchedIndex={matchedIndex} />
        )}
      </div>
    </EuiPopover>
  );
};
