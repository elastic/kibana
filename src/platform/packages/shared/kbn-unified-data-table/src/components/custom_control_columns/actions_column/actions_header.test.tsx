/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionsHeader } from './actions_header';

const setup = (props: React.ComponentProps<typeof ActionsHeader>) => {
  render(<ActionsHeader {...props} />);
};

describe('<ActionsHeader />', () => {
  describe('when the maxWidth is greater than the text width', () => {
    it('should show the text', () => {
      const maxWidth = 500;
      setup({ maxWidth });

      expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderText')).toBeVisible();
    });

    it('should NOT show the icon', () => {
      const maxWidth = 500;
      setup({ maxWidth });

      expect(
        screen.queryByTestId('unifiedDataTable_actionsColumnHeaderIcon')
      ).not.toBeInTheDocument();
    });
  });

  describe('when the maxWidth is less than the text width', () => {
    it('should NOT show the text', () => {
      const maxWidth = 0;
      setup({ maxWidth });

      expect(
        screen.queryByTestId('unifiedDataTable_actionsColumnHeaderText')
      ).not.toBeInTheDocument();
    });

    it('should show the icon', () => {
      const maxWidth = 0;
      setup({ maxWidth });

      expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderIcon')).toBeVisible();
    });
  });
});
