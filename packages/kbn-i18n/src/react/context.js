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

import { PureComponent } from 'react';
import PropTypes from 'prop-types';

/**
 * Provides intl context to a child component using React render callback pattern
 * @example
 * <I18nContext>
 *   {intl => (
 *     <input
 *       placeholder={intl.formatMessage({
           id: 'my-id',
           defaultMessage: 'my default message',
         })}
 *     />
 *   )}
 * </I18nContext>
 */
export class I18nContext extends PureComponent {
  static propTypes = {
    children: PropTypes.func.isRequired,
  };

  render() {
    return this.props.children(this.context.intl);
  }
}
