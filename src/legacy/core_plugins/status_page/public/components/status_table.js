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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { State as StatePropType } from '../lib/prop_types';
import {
  EuiBasicTable,
  EuiIcon,
} from '@elastic/eui';
import { i18n }  from '@kbn/i18n';


class StatusTable extends Component {
  static propTypes = {
    statuses: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,  // plugin id
      state: StatePropType.isRequired     // state of the plugin
    }))  // can be null
  };

  static columns = [{
    field: 'state',
    name: '',
    render: state => <EuiIcon type="dot" aria-hidden color={state.uiColor} />,
    width: '32px'
  }, {
    field: 'id',
    name: i18n.translate('statusPage.statusTable.columns.idHeader', {
      defaultMessage: 'ID',
    }),
  }, {
    field: 'state',
    name: i18n.translate('statusPage.statusTable.columns.statusHeader', {
      defaultMessage: 'Status',
    }),
    render: state => <span>{ state.message }</span>
  }];

  static getRowProps = ({ state }) => {
    return {
      className: `status-table-row-${state.uiColor}`
    };
  };

  render() {
    const { statuses } = this.props;

    if (!statuses) {
      return null;
    }

    return (
      <EuiBasicTable
        columns={StatusTable.columns}
        items={statuses}
        rowProps={StatusTable.getRowProps}
        data-test-subj="statusBreakdown"
      />
    );
  }
}

export default StatusTable;
