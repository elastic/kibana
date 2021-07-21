import React from 'react';
import classNames from 'classnames';

import { EuiIcon, EuiNotificationBadge } from '@elastic/eui';
import { OptionsListEmbeddable, OptionsListEmbeddableInput } from './options_list_embeddable';
import { InputControlOutput } from '../../embeddable/types';
import { withEmbeddableSubscription } from '../../../../../../embeddable/public';

export const OptionsListSummaryInner = ({ input }: { input: OptionsListEmbeddableInput }) => {
  const { selectedItems } = input;

  return (
    <>
      <span
        className={classNames('optionsList--selections', {
          'optionsList--selectionsEmpty': !selectedItems?.length,
        })}
      >
        {!selectedItems?.length ? 'Select...' : selectedItems.join(', ')}
      </span>

      <span
        className="optionsList--notification"
        style={{
          visibility: selectedItems?.length && selectedItems.length > 1 ? 'visible' : 'hidden',
        }}
      >
        <EuiNotificationBadge size={'m'} color="subdued">
          {selectedItems?.length}
        </EuiNotificationBadge>
      </span>

      <span className="optionsList--notification">
        <EuiIcon type={'arrowDown'} />
      </span>
    </>
  );
};

export const OptionsListSummary = withEmbeddableSubscription<
  OptionsListEmbeddableInput,
  InputControlOutput,
  OptionsListEmbeddable
>(OptionsListSummaryInner);
