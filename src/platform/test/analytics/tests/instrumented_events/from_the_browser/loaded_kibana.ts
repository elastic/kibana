/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../services';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ebtUIHelper = getService('kibana_ebt_ui');
  const { common } = getPageObjects(['common']);
  const browser = getService('browser');

  describe('Loaded Kibana', () => {
    beforeEach(async () => {
      await common.navigateToApp('home');
    });

    it('should emit the legacy "Loaded Kibana"', async () => {
      const [event] = await ebtUIHelper.getEvents(1, { eventTypes: ['Loaded Kibana'] });

      expect(event.event_type).to.eql('Loaded Kibana');
      expect(event.properties).to.have.property('kibana_version');
      expect(event.properties.kibana_version).to.be.a('string');
      expect(event.properties).to.have.property('protocol');
      expect(event.properties.protocol).to.be.a('string');
    });

    it('should emit the kibana_loaded event', async () => {
      const [event] = await ebtUIHelper.getEvents(1, {
        eventTypes: ['performance_metric'],
        filters: { 'properties.eventName': { eq: 'kibana_loaded' } },
      });

      // New event
      expect(event.event_type).to.eql('performance_metric');
      expect(event.properties.eventName).to.eql('kibana_loaded');

      // meta
      expect(event.properties).to.have.property('meta');

      const meta = event.properties.meta as Record<string, any>;
      expect(meta.kibana_version).to.be.a('string');
      expect(meta.protocol).to.be.a('string');

      // Kibana Loaded timings
      expect(event.properties).to.have.property('duration');
      expect(event.properties.duration).to.be.a('number');

      expect(event.properties).to.have.property('key1', 'load_started');
      expect(event.properties).to.have.property('key2', 'bootstrap_started');
      expect(event.properties).to.have.property('key3', 'core_created');
      expect(event.properties).to.have.property('key4', 'setup_done');
      expect(event.properties).to.have.property('key5', 'start_done');

      expect(event.properties.value1).to.be.a('number');
      expect(event.properties.value2).to.be.a('number');
      expect(event.properties.value3).to.be.a('number');
      expect(event.properties.value4).to.be.a('number');
      expect(event.properties.value5).to.be.a('number');

      if (browser.isChromium()) {
        // Kibana Loaded memory
        expect(meta).to.have.property('jsHeapSizeLimit');
        expect(meta.jsHeapSizeLimit).to.be.a('number');
        expect(meta).to.have.property('totalJSHeapSize');
        expect(meta.totalJSHeapSize).to.be.a('number');
        expect(meta).to.have.property('usedJSHeapSize');
        expect(meta.usedJSHeapSize).to.be.a('number');
      }
    });
  });
}
