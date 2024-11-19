/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { mockTelemetryConstants, mockTelemetryService } from '../mocks';
import { OptInMessage } from './opt_in_message';

describe('OptInMessage', () => {
  const addBasePath = httpServiceMock.createBasePath().prepend;
  const telemetryConstants = mockTelemetryConstants();

  describe('when opted-in', () => {
    const telemetryService = mockTelemetryService({ config: { optIn: true } });

    let dom: ReactWrapper;

    beforeAll(() => {
      dom = mountWithIntl(
        <OptInMessage
          telemetryConstants={telemetryConstants}
          telemetryService={telemetryService}
          addBasePath={addBasePath}
        />
      );
    });

    afterAll(() => {
      dom.unmount();
    });

    it('claims that telemetry is enabled', () => {
      expect(dom.text()).toContain('Usage collection is enabled.');
    });

    it('offers the link to disable it', () => {
      expect(dom.text()).toContain('Disable usage collection.');
    });
  });

  describe('when opted-out', () => {
    const telemetryService = mockTelemetryService({ config: { optIn: false } });

    let dom: ReactWrapper;

    beforeAll(() => {
      dom = mountWithIntl(
        <OptInMessage
          telemetryConstants={telemetryConstants}
          telemetryService={telemetryService}
          addBasePath={addBasePath}
        />
      );
    });

    afterAll(() => {
      dom.unmount();
    });

    it('claims that telemetry is disabled', () => {
      expect(dom.text()).toContain('Usage collection is disabled.');
    });

    it('offers the link to enable it', () => {
      expect(dom.text()).toContain('Enable usage collection.');
    });
  });

  describe('when null', () => {
    const telemetryService = mockTelemetryService({ config: { optIn: null } });

    let dom: ReactWrapper;

    beforeAll(() => {
      dom = mountWithIntl(
        <OptInMessage
          telemetryConstants={telemetryConstants}
          telemetryService={telemetryService}
          addBasePath={addBasePath}
        />
      );
    });

    afterAll(() => {
      dom.unmount();
    });

    it('claims that telemetry is disabled', () => {
      expect(dom.text()).toContain('Usage collection is disabled.');
    });

    it('offers the link to enable it', () => {
      expect(dom.text()).toContain('Enable usage collection.');
    });
  });
});
