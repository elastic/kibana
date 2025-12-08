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
import userEvent from '@testing-library/user-event';
import { TemplateList } from './template_list';
import type { RuleTypeModalProps } from './rule_type_modal';

describe('TemplateList', () => {
  const mockTemplates: RuleTypeModalProps['templates'] = [
    {
      id: 'template-1',
      name: 'Template 1',
      tags: ['tag1', 'tag2'],
      ruleTypeId: 'rule-type-1',
      ruleTypeName: 'Rule Type 1',
      producer: 'stackAlerts',
    },
    {
      id: 'template-2',
      name: 'Template 2',
      tags: ['tag3'],
      ruleTypeId: 'rule-type-2',
      ruleTypeName: 'Rule Type 2',
      producer: 'logs',
    },
    {
      id: 'template-3',
      name: 'Template 3',
      tags: [],
      ruleTypeId: 'rule-type-3',
      ruleTypeName: undefined,
      producer: 'apm',
    },
  ];

  const defaultProps = {
    templates: mockTemplates,
    onSelectTemplate: jest.fn(),
    hasMore: false,
    onLoadMore: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all template cards correctly', () => {
    render(<TemplateList {...defaultProps} />);

    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template 2')).toBeInTheDocument();
    expect(screen.getByText('Template 3')).toBeInTheDocument();
  });

  it('should render template cards with correct test subjects', () => {
    render(<TemplateList {...defaultProps} />);

    expect(screen.getByTestId('template-1-SelectOption')).toBeInTheDocument();
    expect(screen.getByTestId('template-2-SelectOption')).toBeInTheDocument();
    expect(screen.getByTestId('template-3-SelectOption')).toBeInTheDocument();
  });

  it('should call onSelectTemplate when card is clicked', async () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateList {...defaultProps} onSelectTemplate={onSelectTemplate} />);

    const card = screen.getByTestId('template-1-SelectOption');
    await userEvent.click(card);

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1');
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
  });

  it('should call onSelectTemplate when Enter key is pressed on card', async () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateList {...defaultProps} onSelectTemplate={onSelectTemplate} />);

    const card = screen.getByTestId('template-1-SelectOption');
    await userEvent.type(card, '{Enter}');

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1');
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
  });

  it('should call onSelectTemplate when Space key is pressed on card', async () => {
    const onSelectTemplate = jest.fn();
    render(<TemplateList {...defaultProps} onSelectTemplate={onSelectTemplate} />);

    const card = screen.getByTestId('template-1-SelectOption');
    await userEvent.type(card, ' ');

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1');
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
  });

  it('should render tags correctly', () => {
    render(<TemplateList {...defaultProps} />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should not render tags section when template has no tags', () => {
    const templatesWithoutTags: RuleTypeModalProps['templates'] = [
      {
        id: 'template-no-tags',
        name: 'Template No Tags',
        tags: [],
        ruleTypeId: 'rule-type-1',
      },
    ];

    render(<TemplateList {...defaultProps} templates={templatesWithoutTags} />);

    expect(screen.queryByRole('mark')).not.toBeInTheDocument(); // EuiBadge uses mark element
  });

  it('should render rule type name when provided', () => {
    render(<TemplateList {...defaultProps} />);

    // Rule type name is rendered with CSS text-transform: uppercase
    expect(screen.getByText('Rule Type 1')).toBeInTheDocument();
    expect(screen.getByText('Rule Type 2')).toBeInTheDocument();
  });

  it('should not render rule type name section when not provided', () => {
    const templatesWithoutRuleTypeName: RuleTypeModalProps['templates'] = [
      {
        id: 'template-no-rule-type-name',
        name: 'Template No Rule Type Name',
        tags: [],
        ruleTypeId: 'rule-type-1',
        ruleTypeName: undefined,
      },
    ];

    render(<TemplateList {...defaultProps} templates={templatesWithoutRuleTypeName} />);

    // Rule type name should not be rendered
    expect(screen.queryByText(/RULE TYPE/)).not.toBeInTheDocument();
  });

  it('should show load more button when hasMore is true', () => {
    render(<TemplateList {...defaultProps} hasMore={true} />);

    expect(screen.getByTestId('templateList-loadMore')).toBeInTheDocument();
    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('should not show load more button when hasMore is false', () => {
    render(<TemplateList {...defaultProps} hasMore={false} />);

    expect(screen.queryByTestId('templateList-loadMore')).not.toBeInTheDocument();
  });

  it('should call onLoadMore when load more button is clicked', async () => {
    const onLoadMore = jest.fn();
    render(<TemplateList {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />);

    const loadMoreButton = screen.getByTestId('templateList-loadMore');
    await userEvent.click(loadMoreButton);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('should show loading indicator on load more button when isLoading is true', () => {
    render(<TemplateList {...defaultProps} hasMore={true} isLoading={true} />);

    const loadMoreButton = screen.getByTestId('templateList-loadMore');
    // EUI adds a loading spinner when isLoading is true
    expect(loadMoreButton).toBeInTheDocument();
  });

  it('should render empty list when no templates provided', () => {
    render(<TemplateList {...defaultProps} templates={[]} />);

    expect(screen.queryByTestId(/-SelectOption/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('templateList-loadMore')).not.toBeInTheDocument();
  });

  it('should handle templates with all fields populated', () => {
    const fullTemplate: RuleTypeModalProps['templates'] = [
      {
        id: 'full-template',
        name: 'Full Template',
        tags: ['tag1', 'tag2', 'tag3'],
        ruleTypeId: 'rule-type-full',
        ruleTypeName: 'Full Rule Type',
        producer: 'observability',
      },
    ];

    render(<TemplateList {...defaultProps} templates={fullTemplate} />);

    expect(screen.getByText('Full Template')).toBeInTheDocument();
    // Rule type name is rendered with CSS text-transform: uppercase
    expect(screen.getByText('Full Rule Type')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should render multiple templates with unique keys', () => {
    render(<TemplateList {...defaultProps} />);

    const cards = screen.getAllByTestId(/-SelectOption/);
    expect(cards).toHaveLength(3);
  });
});
