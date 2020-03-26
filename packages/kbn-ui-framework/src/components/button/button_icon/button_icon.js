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

import classNames from 'classnames';

const ICON_TYPES = ['create', 'delete', 'previous', 'next', 'loading', 'settings', 'menu'];

const KuiButtonIcon = props => {
  const typeToClassNameMap = {
    create: 'fa-plus',
    delete: 'fa-trash',
    previous: 'fa-chevron-left',
    next: 'fa-chevron-right',
    loading: 'fa-spinner fa-spin',
    settings: 'fa-gear',
    menu: 'fa-bars',
  };

  const iconClasses = classNames('kuiButton__icon kuiIcon', props.className, {
    [typeToClassNameMap[props.type]]: props.type,
  });

  // Purely decorative icons should be hidden from screen readers. Button icons are purely
  // decorate since assisted users will want to click on the button itself, not the icon within.
  // (https://www.w3.org/WAI/GL/wiki/Using_aria-hidden%3Dtrue_on_an_icon_font_that_AT_should_ignore)
  return <span aria-hidden="true" className={iconClasses} />;
};

KuiButtonIcon.propTypes = {
  type: PropTypes.oneOf(ICON_TYPES),
  className: PropTypes.string,
};

export { ICON_TYPES, KuiButtonIcon };
