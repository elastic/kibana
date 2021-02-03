/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiButtonProps,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { IndexPatternRef } from './types';

export type ChangeIndexPatternTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

// TODO: refactor to shared component with ../../../../../../../../x-pack/legacy/plugins/lens/public/indexpattern_plugin/change_indexpattern

export function ChangeIndexPattern({
  indexPatternRefs,
  indexPatternId,
  onChangeIndexPattern,
  trigger,
  selectableProps,
}: {
  trigger: ChangeIndexPatternTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  onChangeIndexPattern: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps<{ value: string }>;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <EuiButton
        fullWidth
        color="text"
        iconSide="right"
        iconType="arrowDown"
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        {...rest}
      >
        <strong>{label}</strong>
      </EuiButton>
    );
  };

  return (
    <EuiPopover
      button={createTrigger()}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      display="block"
      panelPaddingSize="s"
    >
      <div style={{ width: 320 }}>
        <EuiPopoverTitle>
          {i18n.translate('discover.fieldChooser.indexPattern.changeIndexPatternTitle', {
            defaultMessage: 'Change index pattern',
          })}
        </EuiPopoverTitle>
        <EuiSelectable<{ value: string }>
          data-test-subj="indexPattern-switcher"
          {...selectableProps}
          searchable
          singleSelection="always"
          options={indexPatternRefs.map(({ title, id }) => ({
            label: title,
            key: id,
            value: id,
            checked: id === indexPatternId ? 'on' : undefined,
          }))}
          onChange={(choices) => {
            const choice = (choices.find(({ checked }) => checked) as unknown) as {
              value: string;
            };
            onChangeIndexPattern(choice.value);
            setPopoverIsOpen(false);
          }}
          searchProps={{
            compressed: true,
            ...(selectableProps ? selectableProps.searchProps : undefined),
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
}
