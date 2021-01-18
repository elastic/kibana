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

import React, { memo, useState, BaseSyntheticEvent, KeyboardEvent } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  keys,
  EuiIcon,
  EuiSpacer,
  EuiButtonEmpty,
  EuiPopoverProps,
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
} from '@elastic/eui';

import { LegendItem } from './models';
import { ColorPicker } from '../../../../../charts/public';

interface Props {
  item: LegendItem;
  legendId: string;
  selected: boolean;
  canFilter: boolean;
  anchorPosition: EuiPopoverProps['anchorPosition'];
  onFilter: (item: LegendItem, negate: boolean) => void;
  onSelect: (label: string | null) => (event?: BaseSyntheticEvent) => void;
  onHighlight: (event: BaseSyntheticEvent) => void;
  onUnhighlight: (event: BaseSyntheticEvent) => void;
  setColor: (label: string, color: string | null, event: BaseSyntheticEvent) => void;
  getColor: (label: string) => string;
}

const VisLegendItemComponent = ({
  item,
  legendId,
  selected,
  canFilter,
  anchorPosition,
  onFilter,
  onSelect,
  onHighlight,
  onUnhighlight,
  setColor,
  getColor,
}: Props) => {
  const [idToSelectedMap, setIdToSelectedMap] = useState({});
  /**
   * Keydown listener for a legend entry.
   * This will close the details panel of this legend entry when pressing Escape.
   */
  const onLegendEntryKeydown = (event: KeyboardEvent) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      onSelect(null)();
    }
  };

  const filterOptions: EuiButtonGroupOptionProps[] = [
    {
      id: 'filterIn',
      label: i18n.translate('visTypeVislib.vislib.legend.filterForValueButtonAriaLabel', {
        defaultMessage: 'Filter for value {legendDataLabel}',
        values: { legendDataLabel: item.label },
      }),
      iconType: 'plusInCircle',
      'data-test-subj': `legend-${item.label}-filterIn`,
    },
    {
      id: 'filterOut',
      label: i18n.translate('visTypeVislib.vislib.legend.filterOutValueButtonAriaLabel', {
        defaultMessage: 'Filter out value {legendDataLabel}',
        values: { legendDataLabel: item.label },
      }),
      iconType: 'minusInCircle',
      'data-test-subj': `legend-${item.label}-filterOut`,
    },
  ];

  const handleFilterChange = (id: string) => {
    setIdToSelectedMap({ filterIn: id === 'filterIn', filterOut: id === 'filterOut' });
    onFilter(item, id !== 'filterIn');
  };

  const renderFilterBar = () => (
    <>
      <EuiButtonGroup
        type="multi"
        isIconOnly
        isFullWidth
        legend={i18n.translate('visTypeVislib.vislib.legend.filterOptionsLegend', {
          defaultMessage: '{legendDataLabel}, filter options',
          values: { legendDataLabel: item.label },
        })}
        options={filterOptions}
        onChange={handleFilterChange}
        data-test-subj={`legend-${item.label}-filters`}
        idToSelectedMap={idToSelectedMap}
      />
      <EuiSpacer size="s" />
    </>
  );

  const button = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      flush="left"
      className="visLegend__button"
      onKeyDown={onLegendEntryKeydown}
      onMouseEnter={onHighlight}
      onFocus={onHighlight}
      onClick={onSelect(item.label)}
      onMouseLeave={onUnhighlight}
      onBlur={onUnhighlight}
      data-label={item.label}
      title={item.label}
      aria-label={i18n.translate('visTypeVislib.vislib.legend.toggleOptionsButtonAriaLabel', {
        defaultMessage: '{legendDataLabel}, toggle options',
        values: { legendDataLabel: item.label },
      })}
      data-test-subj={`legend-${item.label}`}
    >
      <EuiIcon
        size="l"
        type="dot"
        color={getColor(item.label)}
        data-test-subj={`legendSelectedColor-${getColor(item.label)}`}
      />
      <span className="visLegend__valueTitle">{item.label}</span>
    </EuiButtonEmpty>
  );

  const renderDetails = () => (
    <EuiPopover
      display="block"
      button={button}
      isOpen={selected}
      anchorPosition={anchorPosition}
      closePopover={onSelect(null)}
      panelPaddingSize="s"
    >
      {canFilter && renderFilterBar()}

      <ColorPicker
        id={legendId}
        label={item.label}
        color={getColor(item.label)}
        onChange={(c, e) => setColor(item.label, c, e)}
      />
    </EuiPopover>
  );

  return (
    <li key={item.label} className="visLegend__value">
      {renderDetails()}
    </li>
  );
};

export const VisLegendItem = memo(VisLegendItemComponent);
