/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiSelectable, EuiSelectableProps } from '@elastic/eui';
// import { trackUiEvent } from '../lens_ui_telemetry';
// import { ToolbarButton, ToolbarButtonProps } from '../../../../../src/plugins/kibana_react/public';
import { ToolbarButton, ToolbarButtonProps } from '../../../../kibana_react/public';

export interface IndexPatternRef {
  id: string;
  title: string;
}

export type ChangeIndexPatternTriggerProps = ToolbarButtonProps & {
  label: string;
  title?: string;
};

export function IndexPatternPicker({
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
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const isMissingCurrent = !indexPatternRefs.some(({ id }) => id === indexPatternId);

  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};

  const createTrigger = function () {
    const { label, title, ...rest } = trigger;
    return (
      <ToolbarButton
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        fullWidth
        {...colorProp}
        {...rest}
      >
        {label}
      </ToolbarButton>
    );
  };

  return (
    <>
      <EuiPopover
        panelClassName="lnsChangeIndexPatternPopover"
        button={createTrigger()}
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverIsOpen(false)}
        display="block"
        panelPaddingSize="s"
        ownFocus
      >
        <div>
          <EuiPopoverTitle>
            {i18n.translate('xpack.lens.indexPattern.changeDataViewTitle', {
              defaultMessage: 'Data view',
            })}
          </EuiPopoverTitle>
          <EuiSelectable<{
            key?: string;
            label: string;
            value?: string;
            checked?: 'on' | 'off' | undefined;
          }>
            {...selectableProps}
            searchable
            singleSelection="always"
            options={indexPatternRefs.map(({ title, id }) => ({
              key: id,
              label: title,
              value: id,
              checked: id === indexPatternId ? 'on' : undefined,
            }))}
            onChange={(choices) => {
              const choice = choices.find(({ checked }) => checked) as unknown as {
                value: string;
              };
              // trackUiEvent('indexpattern_changed');
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
    </>
  );
}
