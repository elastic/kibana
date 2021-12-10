/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiHorizontalRule,
  EuiSelectable,
  EuiButtonProps,
  EuiSpacer,
  EuiPanel,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { IndexPatternRef } from './types';
import { DiscoverIndexPatternManagement } from './discover_index_pattern_management';
import { IndexPattern } from 'src/plugins/data/public';
import { DiscoverServices } from '../../../../build_services';

export type ChangeIndexPatternTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

// TODO: refactor to shared component with ../../../../../../../../x-pack/legacy/plugins/lens/public/indexpattern_plugin/change_indexpattern

export function ChangeIndexPattern({
  indexPatternId,
  indexPatternRefs,
  onChangeIndexPattern,
  selectableProps,
  trigger,
  services,
  selectedIndexPattern,
  useNewFieldsApi,
  editField,
}: {
  indexPatternId?: string;
  indexPatternRefs: IndexPatternRef[];
  onChangeIndexPattern: (newId: string) => void;
  selectableProps?: EuiSelectableProps<{ value: string }>;
  trigger: ChangeIndexPatternTriggerProps;
  selectedIndexPattern: IndexPattern;
  services: DiscoverServices;
  useNewFieldsApi?: boolean;
  editField: (fieldName?: string) => void;
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
      panelPaddingSize="none"
    >
      <div style={{ width: 320 }}>
        <DiscoverIndexPatternManagement
          services={services}
          selectedIndexPattern={selectedIndexPattern}
          useNewFieldsApi={useNewFieldsApi}
          editField={() => {
            setPopoverIsOpen(false);
            editField(undefined);
          }}
        />
        <EuiHorizontalRule margin="none" />
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
            placeholder: 'Find a data view',
            ...(selectableProps ? selectableProps.searchProps : undefined),
          }}
        >
          {(list, search) => (
            <>
              <EuiPanel color="transparent" paddingSize="s">
                {search}
              </EuiPanel>
              {list}
            </>
          )}
        </EuiSelectable>
        <EuiHorizontalRule margin="none" />
        <EuiContextMenuPanel
          size="s"
          items={[
            <EuiContextMenuItem disabled key="new" icon="plusInCircleFilled" onClick={() => {}}>
              New data view...
            </EuiContextMenuItem>,
            <EuiContextMenuItem disabled key="save" icon="save" onClick={() => {}}>
              Save current as new data view...
            </EuiContextMenuItem>,
            <EuiHorizontalRule key="hr" margin="none" />,
            <EuiContextMenuItem hasPanel disabled key="language" onClick={() => {}}>
              Language: KQL
            </EuiContextMenuItem>,
          ]}
        />
      </div>
    </EuiPopover>
  );
}
