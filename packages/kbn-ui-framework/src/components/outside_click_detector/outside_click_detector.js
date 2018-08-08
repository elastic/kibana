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

import {
  Children,
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';

export class KuiOutsideClickDetector extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    onOutsideClick: PropTypes.func.isRequired,
  };

  onClickOutside = event => {
    if (!this.wrapperRef) {
      return;
    }

    if (this.wrapperRef === event.target) {
      return;
    }

    if (this.wrapperRef.contains(event.target)) {
      return;
    }

    this.props.onOutsideClick();
  };

  componentDidMount() {
    document.addEventListener('mousedown', this.onClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onClickOutside);
  }

  render() {
    const props = {
      ...this.props.children.props,
      ref: node => {
        this.wrapperRef = node;
      },
    };

    const child = Children.only(this.props.children);
    return cloneElement(child, props);
  }
}
