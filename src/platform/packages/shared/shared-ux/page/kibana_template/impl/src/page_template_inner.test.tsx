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

import { KibanaPageTemplateInner } from './page_template_inner';

describe('KibanaPageTemplateInner', () => {
  const pageHeader = {
    iconType: 'gear',
    pageTitle: 'Test Page Title',
    description: 'Test page description',
    rightSideItems: [<div key="test">Action Button</div>],
  };

  describe('isEmpty', () => {
    test('renders both pageHeader and children', () => {
      render(
        <KibanaPageTemplateInner isEmptyState={true} pageHeader={pageHeader}>
          <div data-test-subj="child">Child element</div>
        </KibanaPageTemplateInner>
      );

      // Should render the child element when both pageHeader and children exist
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child element')).toBeInTheDocument();

      // Should also render page header elements
      expect(screen.getByText('Test Page Title')).toBeInTheDocument();
      expect(screen.getByText('Test page description')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    test('pageHeader & no children - renders empty prompt', () => {
      render(<KibanaPageTemplateInner isEmptyState={true} pageHeader={pageHeader} />);

      // Should render empty prompt with pageHeader info
      expect(screen.getByText('Test Page Title')).toBeInTheDocument();
      expect(screen.getByText('Test page description')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    test('no pageHeader - renders basic empty state', () => {
      render(<KibanaPageTemplateInner isEmptyState={true} pageHeader={undefined} />);

      // Should render without errors, basic empty state
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    test('no pageHeader, isEmptyState, emptyPageBody - renders custom empty page body', () => {
      render(
        <KibanaPageTemplateInner
          isEmptyState={true}
          pageHeader={undefined}
          emptyPageBody={<div data-test-subj="custom-empty-body">custom empty page body</div>}
        />
      );

      // Should render the custom empty page body
      expect(screen.getByTestId('custom-empty-body')).toBeInTheDocument();
      expect(screen.getByText('custom empty page body')).toBeInTheDocument();
    });
  });

  test('page sidebar - renders sidebar when provided', () => {
    render(
      <KibanaPageTemplateInner pageSideBar={<div data-test-subj="sidebar">Test Sidebar</div>} />
    );

    // Should render the sidebar
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Sidebar')).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    render(
      <KibanaPageTemplateInner className="custom-class" data-test-subj="page-template">
        <div>Content</div>
      </KibanaPageTemplateInner>
    );

    // Should apply custom className
    const pageTemplate = screen.getByTestId('page-template');
    expect(pageTemplate).toHaveClass('custom-class');
    expect(pageTemplate).toHaveClass('kbnPageTemplate');
  });
});
