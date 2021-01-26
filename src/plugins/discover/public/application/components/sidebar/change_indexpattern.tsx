/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import './change_indexpattern.scss';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonProps,
  EuiHighlight,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { EuiSelectableProps } from '@elastic/eui/src/components/selectable/selectable';
import { IndexPatternRef } from './types';
interface PatternListProps {
  patternList: string[];
  patternListActive: string[];
}
const PatternList = ({ patternList, patternListActive }: PatternListProps) => (
  <div className="dscChangeIndexPattern__flex">
    {patternList.map((label) => {
      const isActive = patternListActive.includes(label);
      const badgeContent = isActive
        ? i18n.translate('discover.fieldChooser.indexPattern.changeIndexPatternActive', {
            defaultMessage: 'Active',
          })
        : i18n.translate('discover.fieldChooser.indexPattern.changeIndexPatternInactive', {
            defaultMessage: 'Inactive; index pattern does not match any indices',
          });
      return (
        <EuiToolTip content={badgeContent} key={label} position="top">
          <EuiBadge
            aria-label={badgeContent}
            className="dscChangeIndexPattern__rightSpacer"
            color={'hollow'}
            isDisabled={!isActive}
          >
            {label}
          </EuiBadge>
        </EuiToolTip>
      );
    })}
  </div>
);

export type ChangeIndexPatternTriggerProps = EuiButtonProps & {
  label: string;
  title: string;
  patternList: string[];
  patternListActive: string[];
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
  selectableProps?: EuiSelectableProps;
}) {
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const createTrigger = useMemo(() => {
    const { label, patternList, patternListActive, title, ...rest } = trigger;
    return (
      <EuiButton
        className="dscChangeIndexPattern__button"
        fullWidth
        color="text"
        iconSide="right"
        iconType="arrowDown"
        title={title}
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        {...rest}
      >
        <strong>{label}</strong>
        <br />
        <PatternList patternList={patternList} patternListActive={patternListActive} />
      </EuiButton>
    );
  }, [isPopoverOpen, trigger]);
  const renderOption = useCallback(
    (option, searchValue) => (
      <>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        <br />
        <EuiTextColor color="subdued">
          <small>
            <EuiHighlight className="dscChangeIndexPattern__patternList" search={searchValue}>
              {option.searchableLabel}
            </EuiHighlight>
          </small>
        </EuiTextColor>
      </>
    ),
    []
  );

  const options: EuiSelectableOption[] = useMemo(
    () =>
      indexPatternRefs.map(({ patternList, title, id }) => ({
        label: title,
        key: id,
        value: id,
        searchableLabel: patternList.join(','),
        checked: id === indexPatternId ? 'on' : undefined,
      })),
    [indexPatternId, indexPatternRefs]
  );
  return (
    <EuiPopover
      button={createTrigger}
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
        <EuiSelectable
          data-test-subj="indexPattern-switcher"
          {...selectableProps}
          searchable
          singleSelection="always"
          options={options}
          listProps={{
            rowHeight: 65,
          }}
          renderOption={renderOption}
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
