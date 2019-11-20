/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { memo, BaseSyntheticEvent, KeyboardEvent } from 'react';
import classNames from 'classnames';

import { keyCodes } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPopover } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiButtonGroupOption } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { legendColors, LegendItem } from './models';

interface Props {
  item: LegendItem;
  legendId: string;
  selected: boolean;
  canFilter: boolean;
  onFilter: (item: LegendItem, negate: boolean) => void;
  onSelect: (label: string | null) => (event?: BaseSyntheticEvent) => void;
  onHighlight: (event: BaseSyntheticEvent) => void;
  onUnhighlight: (event: BaseSyntheticEvent) => void;
  setColor: (label: string, color: string) => (event: BaseSyntheticEvent) => void;
  getColor: (label: string) => string;
}

const VisLegendItemComponent = ({
  item,
  legendId,
  selected,
  canFilter,
  onFilter,
  onSelect,
  onHighlight,
  onUnhighlight,
  setColor,
  getColor,
}: Props) => {
  /**
   * Keydown listener for a legend entry.
   * This will close the details panel of this legend entry when pressing Escape.
   */
  const onLegendEntryKeydown = (event: KeyboardEvent) => {
    if (event.keyCode === keyCodes.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      onSelect(null)();
    }
  };

  const filterOptions: EuiButtonGroupOption[] = [
    {
      id: 'filterIn',
      label: i18n.translate('common.ui.vis.visTypes.legend.filterForValueButtonAriaLabel', {
        defaultMessage: 'Filter for value {legendDataLabel}',
        values: { legendDataLabel: item.label },
      }),
      iconType: 'magnifyWithPlus',
      'data-test-subj': `legend-${item.label}-filterIn`,
    },
    {
      id: 'filterOut',
      label: i18n.translate('common.ui.vis.visTypes.legend.filterOutValueButtonAriaLabel', {
        defaultMessage: 'Filter out value {legendDataLabel}',
        values: { legendDataLabel: item.label },
      }),
      iconType: 'magnifyWithMinus',
      'data-test-subj': `legend-${item.label}-filterOut`,
    },
  ];

  const handleFilterChange = (id: string) => {
    onFilter(item, id !== 'filterIn');
  };

  const renderFilterBar = () => (
    <>
      <EuiButtonGroup
        isIconOnly
        isFullWidth
        legend="add legend"
        options={filterOptions}
        onChange={handleFilterChange}
        idSelected="null"
      />
      <EuiSpacer size="m" />
    </>
  );

  const button = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      tabIndex={0}
      className={classNames('visLegend__value', {
        'eui-textTruncate': !selected,
        'eui-textBreakWord': selected,
      })}
      onKeyDown={onLegendEntryKeydown}
      onMouseEnter={onHighlight}
      onFocus={onHighlight}
      onClick={onSelect(item.label)}
      onMouseLeave={onUnhighlight}
      onBlur={onUnhighlight}
      data-label={item.label}
      title={item.label}
      aria-label={i18n.translate('common.ui.vis.visTypes.legend.toggleOptionsButtonAriaLabel', {
        defaultMessage: '{legendDataLabel}, toggle options',
        values: { legendDataLabel: item.label },
      })}
      data-test-subj={`legend-${item.label}`}
    >
      <EuiIcon
        type="dot"
        size="l"
        color={getColor(item.label)}
        data-test-subj={`legendSelectedColor-${getColor(item.label)}`}
      />
      <span className="visLegend__valueLabel">&nbsp;{item.label}</span>
    </EuiButtonEmpty>
  );

  const renderDetails = () => (
    <EuiPopover tabIndex={0} button={button} isOpen={selected} closePopover={onSelect(null)}>
      <div className="visLegend__valueDetails">
        {canFilter && renderFilterBar()}

        <div className="visLegend__valueColorPicker" role="listbox">
          <span id={`${legendId}ColorPickerDesc`} className="euiScreenReaderOnly">
            <FormattedMessage
              id="common.ui.vis.visTypes.legend.setColorScreenReaderDescription"
              defaultMessage="Set color for value {legendDataLabel}"
              values={{ legendDataLabel: item.label }}
            />
          </span>
          {legendColors.map(color => (
            <EuiIcon
              role="option"
              tabIndex={0}
              type="dot"
              size="l"
              color={getColor(item.label)}
              key={color}
              aria-label={color}
              aria-describedby={`${legendId}ColorPickerDesc`}
              aria-selected={color === getColor(item.label)}
              onClick={setColor(item.label, color)}
              onKeyPress={setColor(item.label, color)}
              className={classNames(
                'visLegend__valueColorPicker--dot',
                color === getColor(item.label) ? 'fa-circle-o' : 'fa-circle'
              )}
              style={{ color }}
              data-test-subj={`legendSelectColor-${color}`}
            />
          ))}
        </div>
      </div>
    </EuiPopover>
  );

  return (
    <li key={item.label} className="visLegend__value color">
      {renderDetails()}
    </li>
  );
};

export const VisLegendItem = memo(VisLegendItemComponent);
