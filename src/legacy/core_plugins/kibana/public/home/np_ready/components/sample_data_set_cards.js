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

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';

import { SampleDataSetCard, INSTALLED_STATUS, UNINSTALLED_STATUS } from './sample_data_set_card';

import { getServices } from '../../kibana_services';

import {
  listSampleDataSets,
  installSampleDataSet,
  uninstallSampleDataSet,
} from '../sample_data_client';

import { i18n } from '@kbn/i18n';

export class SampleDataSetCards extends React.Component {
  constructor(props) {
    super(props);

    this.toastNotifications = getServices().toastNotifications;

    this.state = {
      sampleDataSets: [],
      processingStatus: {},
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    this._isMounted = true;

    this.loadSampleDataSets();
  }

  loadSampleDataSets = async () => {
    let sampleDataSets;
    try {
      sampleDataSets = await listSampleDataSets();
    } catch (fetchError) {
      this.toastNotifications.addDanger({
        title: i18n.translate('kbn.home.sampleDataSet.unableToLoadListErrorMessage', {
          defaultMessage: 'Unable to load sample data sets list',
        }),
        text: `${fetchError.message}`,
      });
      sampleDataSets = [];
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      sampleDataSets: sampleDataSets.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }),
      processingStatus: {},
    });
  };

  install = async id => {
    const targetSampleDataSet = this.state.sampleDataSets.find(sampleDataSet => {
      return sampleDataSet.id === id;
    });

    this.setState(prevState => ({
      processingStatus: { ...prevState.processingStatus, [id]: true },
    }));

    try {
      await installSampleDataSet(id, targetSampleDataSet.defaultIndex);
    } catch (fetchError) {
      if (this._isMounted) {
        this.setState(prevState => ({
          processingStatus: { ...prevState.processingStatus, [id]: false },
        }));
      }
      this.toastNotifications.addDanger({
        title: i18n.translate('kbn.home.sampleDataSet.unableToInstallErrorMessage', {
          defaultMessage: 'Unable to install sample data set: {name}',
          values: { name: targetSampleDataSet.name },
        }),
        text: `${fetchError.message}`,
      });
      return;
    }

    if (this._isMounted) {
      this.setState(prevState => ({
        processingStatus: { ...prevState.processingStatus, [id]: false },
        sampleDataSets: prevState.sampleDataSets.map(sampleDataSet => {
          if (sampleDataSet.id === id) {
            sampleDataSet.status = INSTALLED_STATUS;
          }
          return sampleDataSet;
        }),
      }));
    }

    this.toastNotifications.addSuccess({
      title: i18n.translate('kbn.home.sampleDataSet.installedLabel', {
        defaultMessage: '{name} installed',
        values: { name: targetSampleDataSet.name },
      }),
      ['data-test-subj']: 'sampleDataSetInstallToast',
    });
  };

  uninstall = async id => {
    const targetSampleDataSet = this.state.sampleDataSets.find(sampleDataSet => {
      return sampleDataSet.id === id;
    });

    this.setState(prevState => ({
      processingStatus: { ...prevState.processingStatus, [id]: true },
    }));

    try {
      await uninstallSampleDataSet(id, targetSampleDataSet.defaultIndex);
    } catch (fetchError) {
      if (this._isMounted) {
        this.setState(prevState => ({
          processingStatus: { ...prevState.processingStatus, [id]: false },
        }));
      }
      this.toastNotifications.addDanger({
        title: i18n.translate('kbn.home.sampleDataSet.unableToUninstallErrorMessage', {
          defaultMessage: 'Unable to uninstall sample data set: {name}',
          values: { name: targetSampleDataSet.name },
        }),
        text: `${fetchError.message}`,
      });
      return;
    }

    if (this._isMounted) {
      this.setState(prevState => ({
        processingStatus: { ...prevState.processingStatus, [id]: false },
        sampleDataSets: prevState.sampleDataSets.map(sampleDataSet => {
          if (sampleDataSet.id === id) {
            sampleDataSet.status = UNINSTALLED_STATUS;
          }
          return sampleDataSet;
        }),
      }));
    }

    this.toastNotifications.addSuccess({
      title: i18n.translate('kbn.home.sampleDataSet.uninstalledLabel', {
        defaultMessage: '{name} uninstalled',
        values: { name: targetSampleDataSet.name },
      }),
      ['data-test-subj']: 'sampleDataSetUninstallToast',
    });
  };

  lightOrDarkImage = sampleDataSet => {
    return getServices().uiSettings.get('theme:darkMode') && sampleDataSet.darkPreviewImagePath
      ? sampleDataSet.darkPreviewImagePath
      : sampleDataSet.previewImagePath;
  };

  render() {
    return (
      <EuiFlexGrid columns={3} className="homSampleDataSetCards">
        {this.state.sampleDataSets.map(sampleDataSet => {
          return (
            <EuiFlexItem key={sampleDataSet.id}>
              <SampleDataSetCard
                id={sampleDataSet.id}
                description={sampleDataSet.description}
                name={sampleDataSet.name}
                overviewDashboard={sampleDataSet.overviewDashboard}
                appLinks={sampleDataSet.appLinks}
                status={sampleDataSet.status}
                isProcessing={_.get(this.state.processingStatus, sampleDataSet.id, false)}
                statusMsg={sampleDataSet.statusMsg}
                previewUrl={this.props.addBasePath(this.lightOrDarkImage(sampleDataSet))}
                onInstall={this.install}
                onUninstall={this.uninstall}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    );
  }
}

SampleDataSetCards.propTypes = {
  addBasePath: PropTypes.func.isRequired,
};
