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

import { EuiKeyboardAccessible } from '@elastic/eui';
import { keyCodes } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { legendColors, LegendItem } from './models';

interface Props {
  item: LegendItem;
  legendId: string;
  selected: boolean;
  canFilter: boolean;
  onFilter: (item: LegendItem, negate: boolean) => () => void;
  onSelect: (label: string | null) => (event?: BaseSyntheticEvent) => void;
  highlight: (event: BaseSyntheticEvent) => void;
  unhighlight: (event: BaseSyntheticEvent) => void;
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
  highlight,
  unhighlight,
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

  const renderFilterBar = (legendItem: LegendItem) => (
    <div className="kuiButtonGroup kuiButtonGroup--united kuiButtonGroup--fullWidth">
      <button
        className="kuiButton kuiButton--basic kuiButton--small"
        onClick={onFilter(legendItem, false)}
        aria-label={i18n.translate('common.ui.vis.visTypes.legend.filterForValueButtonAriaLabel', {
          defaultMessage: 'Filter for value {legendDataLabel}',
          values: { legendDataLabel: legendItem.label },
        })}
        data-test-subj={`legend-${legendItem.label}-filterIn`}
      >
        <span className="kuiIcon fa-search-plus" />
      </button>

      <button
        className="kuiButton kuiButton--basic kuiButton--small"
        onClick={onFilter(legendItem, true)}
        aria-label={i18n.translate('common.ui.vis.visTypes.legend.filterOutValueButtonAriaLabel', {
          defaultMessage: 'Filter out value {legendDataLabel}',
          values: { legendDataLabel: legendItem.label },
        })}
        data-test-subj={`legend-${legendItem.label}-filterOut`}
      >
        <span className="kuiIcon fa-search-minus" />
      </button>
    </div>
  );

  const renderDetails = (legendItem: LegendItem) => (
    <div className="visLegend__valueDetails">
      {canFilter && renderFilterBar(legendItem)}

      <div className="visLegend__valueColorPicker" role="listbox">
        <span id={`${legendId}ColorPickerDesc`} className="euiScreenReaderOnly">
          {i18n.translate('common.ui.vis.visTypes.legend.setColorScreenReaderDescription', {
            defaultMessage: `Set color for value ${legendItem.label}`,
          })}
        </span>
        {legendColors.map(color => (
          <i
            kbn-accessible-click="true"
            role="option"
            tabIndex={0}
            key={color}
            aria-label={color}
            aria-describedby={`${legendId}ColorPickerDesc`}
            aria-selected={color === getColor(legendItem.label)}
            onClick={setColor(legendItem.label, color)}
            onKeyPress={setColor(legendItem.label, color)}
            className={classNames([
              'fa dot visLegend__valueColorPickerDot',
              color === getColor(legendItem.label) ? 'fa-circle-o' : 'fa-circle',
            ])}
            style={{ color }}
            data-test-subj={`legendSelectColor-${color}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <li key={item.label} className="visLegend__value color">
      <EuiKeyboardAccessible>
        <div
          tabIndex={0}
          onKeyDown={onLegendEntryKeydown}
          onMouseEnter={highlight}
          onFocus={highlight}
          onClick={onSelect(item.label)}
          onMouseLeave={unhighlight}
          onBlur={unhighlight}
          data-label={item.label}
        >
          <div
            data-label={item.label}
            className={classNames([
              'visLegend__valueTitle',
              selected ? 'visLegend__valueTitle--full' : 'visLegend__valueTitle--truncate',
            ])}
            title={item.label}
            aria-label={i18n.translate(
              'common.ui.vis.visTypes.legend.toggleOptionsButtonAriaLabel',
              {
                defaultMessage: '{legendDataLabel}, toggle options',
                values: { legendDataLabel: item.label },
              }
            )}
            data-test-subj={`legend-${item.label}`}
          >
            <i
              className="fa fa-circle"
              style={{ color: getColor(item.label) }}
              data-test-subj={`legendSelectedColor-${getColor(item.label)}`}
            />
            &nbsp;{item.label}
          </div>

          {selected && renderDetails(item)}
        </div>
      </EuiKeyboardAccessible>
    </li>
  );
};

export const VisLegendItem = memo(VisLegendItemComponent, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.canFilter === next.canFilter &&
    prev.item.label === next.item.label
  );
});
