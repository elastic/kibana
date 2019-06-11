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

import PropTypes from 'prop-types';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ICONS = [
  {
    value: 'fa-asterisk',
    label: i18n.translate('tsvb.iconSelect.asteriskLabel', { defaultMessage: 'Asterisk' }),
  },
  {
    value: 'fa-bell',
    label: i18n.translate('tsvb.iconSelect.bellLabel', { defaultMessage: 'Bell' }),
  },
  {
    value: 'fa-bolt',
    label: i18n.translate('tsvb.iconSelect.boltLabel', { defaultMessage: 'Bolt' }),
  },
  {
    value: 'fa-comment',
    label: i18n.translate('tsvb.iconSelect.commentLabel', { defaultMessage: 'Comment' }),
  },
  {
    value: 'fa-map-marker',
    label: i18n.translate('tsvb.iconSelect.mapMarkerLabel', { defaultMessage: 'Map Marker' }),
  },
  {
    value: 'fa-map-pin',
    label: i18n.translate('tsvb.iconSelect.mapPinLabel', { defaultMessage: 'Map Pin' }),
  },
  {
    value: 'fa-star',
    label: i18n.translate('tsvb.iconSelect.starLabel', { defaultMessage: 'Star' }),
  },
  { value: 'fa-tag', label: i18n.translate('tsvb.iconSelect.tagLabel', { defaultMessage: 'Tag' }) },
  // TODO: Watch for https://github.com/elastic/eui/issues/1871
  // { value: 'fa-bomb', label: i18n.translate('tsvb.iconSelect.bombLabel', { defaultMessage: 'Bomb' }) },
  // { value: 'fa-bug', label: i18n.translate('tsvb.iconSelect.bugLabel', { defaultMessage: 'Bug' }) },
  // {
  //   value: 'fa-exclamation-circle',
  //   label: i18n.translate('tsvb.iconSelect.exclamationCircleLabel', { defaultMessage: 'Exclamation Circle' })
  // },
  // {
  //   value: 'fa-exclamation-triangle',
  //   label: i18n.translate('tsvb.iconSelect.exclamationTriangleLabel', { defaultMessage: 'Exclamation Triangle' })
  // },
  // { value: 'fa-fire', label: i18n.translate('tsvb.iconSelect.fireLabel', { defaultMessage: 'Fire' }) },
  // { value: 'fa-flag', label: i18n.translate('tsvb.iconSelect.flagLabel', { defaultMessage: 'Flag' }) },
  // { value: 'fa-heart', label: i18n.translate('tsvb.iconSelect.heartLabel', { defaultMessage: 'Heart' }) },
];

export function IconView({ value: icon, label }) {
  return (
    <span>
      <span className={`kuiIcon ${icon}`} aria-hidden="true" />
      {` ${label}`}
    </span>
  );
}

export function IconSelect({ value, onChange }) {
  const selectedIcon = ICONS.find(option => value === option.value);

  return (
    <EuiComboBox
      isClearable={false}
      options={ICONS}
      selectedOptions={selectedIcon ? [selectedIcon] : [ICONS[0]]}
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
