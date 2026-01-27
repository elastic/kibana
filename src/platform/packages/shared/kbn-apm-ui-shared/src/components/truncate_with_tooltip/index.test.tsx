/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TruncateWithTooltip } from '.';

describe('TruncateWithTooltip', () => {
  describe('when only text prop is provided', () => {
    it('should render the text as visible content', () => {
      render(<TruncateWithTooltip text="Hello World" />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should show the text in tooltip on hover', async () => {
      render(<TruncateWithTooltip text="Hello World" />);

      const content = screen.getByText('Hello World');
      fireEvent.mouseOver(content);

      await waitFor(() => {
        // Tooltip content should appear (there will be two instances: one visible, one in tooltip)
        const tooltipContent = document.querySelector('[role="tooltip"]');
        expect(tooltipContent).toBeInTheDocument();
      });
    });
  });

  describe('when content prop is provided', () => {
    it('should render the content prop as visible content', () => {
      render(<TruncateWithTooltip text="Tooltip Text" content="Visible Content" />);

      expect(screen.getByText('Visible Content')).toBeInTheDocument();
    });

    it('should not render the text prop as visible content', () => {
      render(<TruncateWithTooltip text="Tooltip Text" content="Visible Content" />);

      // The text should only appear in the tooltip, not as visible content
      expect(screen.queryByText('Tooltip Text')).not.toBeInTheDocument();
    });

    it('should show the text prop in tooltip on hover', async () => {
      render(<TruncateWithTooltip text="Tooltip Text" content="Visible Content" />);

      const content = screen.getByText('Visible Content');
      fireEvent.mouseOver(content);

      await waitFor(() => {
        const tooltipContent = document.querySelector('[role="tooltip"]');
        expect(tooltipContent).toHaveTextContent('Tooltip Text');
      });
    });
  });

  describe('when content prop is a React element', () => {
    it('should render the React element as visible content', () => {
      const customContent = <span data-test-subj="customContent">Custom Element</span>;
      render(<TruncateWithTooltip text="Tooltip Text" content={customContent} />);

      expect(screen.getByTestId('customContent')).toBeInTheDocument();
      expect(screen.getByText('Custom Element')).toBeInTheDocument();
    });
  });
});
