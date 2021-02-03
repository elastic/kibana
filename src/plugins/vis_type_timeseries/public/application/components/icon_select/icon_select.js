/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiComboBox, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ICON_TYPES_MAP } from '../../visualizations/constants/icons';

export const ICONS = [
  {
    value: 'fa-asterisk',
    label: i18n.translate('visTypeTimeseries.iconSelect.asteriskLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'fa-bell',
    label: i18n.translate('visTypeTimeseries.iconSelect.bellLabel', { defaultMessage: 'Bell' }),
  },
  {
    value: 'fa-bolt',
    label: i18n.translate('visTypeTimeseries.iconSelect.boltLabel', { defaultMessage: 'Bolt' }),
  },
  {
    value: 'fa-comment',
    label: i18n.translate('visTypeTimeseries.iconSelect.commentLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'fa-map-marker',
    label: i18n.translate('visTypeTimeseries.iconSelect.mapMarkerLabel', {
      defaultMessage: 'Map Marker',
    }),
  },
  {
    value: 'fa-map-pin',
    label: i18n.translate('visTypeTimeseries.iconSelect.mapPinLabel', {
      defaultMessage: 'Map Pin',
    }),
  },
  {
    value: 'fa-star',
    label: i18n.translate('visTypeTimeseries.iconSelect.starLabel', { defaultMessage: 'Star' }),
  },
  {
    value: 'fa-tag',
    label: i18n.translate('visTypeTimeseries.iconSelect.tagLabel', { defaultMessage: 'Tag' }),
  },
  {
    value: 'fa-bomb',
    label: i18n.translate('visTypeTimeseries.iconSelect.bombLabel', { defaultMessage: 'Bomb' }),
  },
  {
    value: 'fa-bug',
    label: i18n.translate('visTypeTimeseries.iconSelect.bugLabel', { defaultMessage: 'Bug' }),
  },
  {
    value: 'fa-exclamation-circle',
    label: i18n.translate('visTypeTimeseries.iconSelect.exclamationCircleLabel', {
      defaultMessage: 'Exclamation Circle',
    }),
  },
  {
    value: 'fa-exclamation-triangle',
    label: i18n.translate('visTypeTimeseries.iconSelect.exclamationTriangleLabel', {
      defaultMessage: 'Exclamation Triangle',
    }),
  },
  {
    value: 'fa-fire',
    label: i18n.translate('visTypeTimeseries.iconSelect.fireLabel', { defaultMessage: 'Fire' }),
  },
  {
    value: 'fa-flag',
    label: i18n.translate('visTypeTimeseries.iconSelect.flagLabel', { defaultMessage: 'Flag' }),
  },
  {
    value: 'fa-heart',
    label: i18n.translate('visTypeTimeseries.iconSelect.heartLabel', { defaultMessage: 'Heart' }),
  },
];

export function IconView({ value: icon, label }) {
  return (
    <span>
      <EuiIcon type={ICON_TYPES_MAP[icon]} />
      {` ${label}`}
    </span>
  );
}

export function IconSelect({ value, onChange }) {
  const selectedIcon = ICONS.find((option) => value === option.value) || ICONS[0];

  return (
    <EuiComboBox
      isClearable={false}
      options={ICONS}
      selectedOptions={[selectedIcon]}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      renderOption={IconView}
    />
  );
}

IconSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};
