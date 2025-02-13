/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualBuilder } = getPageObjects(['visualBuilder']);
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  describe('visual builder tsdb check', function describeIndexTests() {
    before(async () => {
      log.info(`loading sample TSDB index...`);
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb');
      log.info(`creating the TSDB data view...`);
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb'
      );
      log.info(`setting the TSDB dataView as default...`);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '90943e30-9a47-11e8-b64d-95841ca0c247',
      });
    });

    after(async () => {
      log.info(`removing the TSDB index...`);
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb');
      log.info(`removing the TSDB dataView...`);
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb'
      );
      log.info(`unsetting the TSDB dataView default...`);
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    beforeEach(async () => {
      await visualBuilder.resetPage();
    });

    it('should render from a tsdb dataView regular fields with no issues', async () => {
      await visualBuilder.selectAggType('Average');
      await visualBuilder.setFieldForAggregation('bytes');
      const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();
      expect(isFieldForAggregationValid).to.be(true);
      expect(await testSubjects.exists('visualization-error-text')).to.be(false);
    });

    it('should render from a tsdb dataView supported tsdb field type', async () => {
      await visualBuilder.selectAggType('Average');
      await visualBuilder.setFieldForAggregation('bytes_gauge');
      const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();
      expect(isFieldForAggregationValid).to.be(true);
      expect(await testSubjects.exists('visualization-error-text')).to.be(false);
    });
  });
}
