/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiButtonProps,
  EuiSelectableMessage,
  EuiText,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { IndexPatternRef } from './types';

export type ChangeIndexPatternTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

// TODO: refactor to shared component with ../../../../../../../../x-pack/legacy/plugins/lens/public/indexpattern_plugin/change_indexpattern

export function ChangeIndexPattern({
  indexPatternId,
  indexPatternRefs,
  onChangeIndexPattern,
  onAddIndexPattern,
  selectableProps,
  trigger,
}: {
  indexPatternId?: string;
  indexPatternRefs: IndexPatternRef[];
  onChangeIndexPattern: (newId: string) => void;
  onAddIndexPattern: (newId: string) => void;
  selectableProps?: EuiSelectableProps<{ value: string }>;
  trigger: ChangeIndexPatternTriggerProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
            const choice = choices.find(({ checked }) => checked) as unknown as {
              value: string;
            };
            if (choice.value !== indexPatternId) {
              onChangeIndexPattern(choice.value);
            }
            setPopoverIsOpen(false);
          }}
          searchProps={{
            compressed: true,
            ...(selectableProps ? selectableProps.searchProps : undefined),
            onSearch: (value) => setSearchTerm(value),
          }}
          noMatchesMessage={
            <EuiSelectableMessage>
              <EuiText size="m">
                <p>
                  <FormattedMessage
                    id="discover.fieldChooser.indexPattern.noIndexPatternsFound"
                    defaultMessage="No index patterns found"
                  />
                </p>
              </EuiText>
              <p>
                <EuiButton onClick={() => onAddIndexPattern(searchTerm)}>
                  <FormattedMessage
                    id="discover.fieldChooser.indexPattern.viewData"
                    defaultMessage="View data of indices named {indices}"
                    values={{ indices: searchTerm }}
                  />
                </EuiButton>
              </p>
            </EuiSelectableMessage>
          }
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
