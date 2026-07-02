/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TypeIcon } from './type_icon';

jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map([['.abuseipdb', 'plugs']]),
}));

describe('TypeIcon', () => {
  describe('kind="trigger"', () => {
    it.each([
      ['manual', 'play'],
      ['alert', 'warning'],
      ['scheduled', 'clock'],
    ])('renders the built-in icon for "%s"', (triggerType, expectedIcon) => {
      const { container } = render(<TypeIcon type={triggerType} kind="trigger" />);
      expect(container.querySelector(`[data-euiicon-type="${expectedIcon}"]`)).toBeInTheDocument();
    });

    it('falls back to "bolt" for an unknown trigger type', () => {
      const { container } = render(<TypeIcon type="custom-trigger" kind="trigger" />);
      expect(container.querySelector('[data-euiicon-type="bolt"]')).toBeInTheDocument();
    });
  });

  describe('kind="step"', () => {
    it('resolves a connector spec icon when available', () => {
      const { container } = render(<TypeIcon type="abuseipdb.checkIp" kind="step" />);
      expect(container.querySelector('[data-euiicon-type="plugs"]')).toBeInTheDocument();
    });

    it('falls back to the static base-type icon map', () => {
      const { container } = render(<TypeIcon type="http" kind="step" />);
      expect(container.querySelector('[data-euiicon-type="globe"]')).toBeInTheDocument();
    });

    it('falls back to "plugs" for an unrecognized step type', () => {
      const { container } = render(<TypeIcon type="unknown_connector.doThing" kind="step" />);
      expect(container.querySelector('[data-euiicon-type="plugs"]')).toBeInTheDocument();
    });
  });
});
