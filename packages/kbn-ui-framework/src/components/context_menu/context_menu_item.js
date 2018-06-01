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

import React, {
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class KuiContextMenuItem extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    icon: PropTypes.element,
    onClick: PropTypes.func,
    hasPanel: PropTypes.bool,
    buttonRef: PropTypes.func,
    disabled: PropTypes.bool,
  };

  render() {
    const {
      children,
      className,
      hasPanel,
      icon,
      buttonRef,
      disabled,
      ...rest
    } = this.props;

    let iconInstance;

    if (icon) {
      iconInstance = cloneElement(icon, {
        className: classNames(icon.props.className, 'kuiContextMenu__icon'),
      });
    }

    let arrow;

    if (hasPanel) {
      arrow = <span className="kuiContextMenu__arrow kuiIcon fa-angle-right" />;
    }

    const classes = classNames('kuiContextMenuItem', className, {
      'kuiContextMenuItem-disabled': disabled,
    });

    return (
      <button
        className={classes}
        ref={buttonRef}
        disabled={disabled}
        {...rest}
      >
        <span className="kuiContextMenu__itemLayout">
          {iconInstance}
          <span className="kuiContextMenuItem__text">
            {children}
          </span>
          {arrow}
        </span>
      </button>
    );
  }
}
