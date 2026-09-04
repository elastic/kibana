/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlyoutSection } from './flyout_section';
import { FlyoutSubsection } from './flyout_subsection';
import { FlyoutAccordion } from './flyout_accordion';

// ─── FlyoutSection ───────────────────────────────────────────────────────────

describe('FlyoutSection', () => {
  it('renders the title and children', () => {
    render(
      <FlyoutSection title="Summary">
        <span>Content</span>
      </FlyoutSection>
    );
    expect(screen.getByRole('heading', { name: 'Summary', level: 4 })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('honours data-test-subj', () => {
    render(
      <FlyoutSection title="A" data-test-subj="mySection">
        body
      </FlyoutSection>
    );
    expect(screen.getByTestId('mySection')).toBeInTheDocument();
  });

  it('renders the action link', () => {
    render(
      <FlyoutSection title="A" action={{ label: 'Edit', onClick: jest.fn() }}>
        body
      </FlyoutSection>
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('sets data-bordered when hasBorder is true', () => {
    const { container } = render(
      <FlyoutSection title="A" hasBorder>
        body
      </FlyoutSection>
    );
    const section = container.querySelector('section');
    expect(section).toHaveAttribute('data-bordered');
  });

  it('omits data-bordered when hasBorder is false', () => {
    const { container } = render(<FlyoutSection title="A">body</FlyoutSection>);
    const section = container.querySelector('section');
    expect(section).not.toHaveAttribute('data-bordered');
  });

  it('marks adjacent sections correctly for CSS dividers', () => {
    const { container } = render(
      <>
        <FlyoutSection title="Bordered" hasBorder>
          first
        </FlyoutSection>
        <FlyoutSection title="Plain">second</FlyoutSection>
      </>
    );
    const sections = container.querySelectorAll('section');
    expect(sections[0]).toHaveAttribute('data-bordered');
    expect(sections[1]).not.toHaveAttribute('data-bordered');
  });
});

// ─── FlyoutSubsection ────────────────────────────────────────────────────────

describe('FlyoutSubsection', () => {
  it('renders the title and children', () => {
    render(
      <FlyoutSubsection title="Details">
        <span>Detail content</span>
      </FlyoutSubsection>
    );
    expect(screen.getByRole('heading', { name: 'Details', level: 5 })).toBeInTheDocument();
    expect(screen.getByText('Detail content')).toBeInTheDocument();
  });

  it('honours data-test-subj', () => {
    render(
      <FlyoutSubsection title="A" data-test-subj="mySub">
        body
      </FlyoutSubsection>
    );
    expect(screen.getByTestId('mySub')).toBeInTheDocument();
  });

  it('sets data-bordered when hasBorder is true', () => {
    const { container } = render(
      <FlyoutSubsection title="A" hasBorder>
        body
      </FlyoutSubsection>
    );
    expect(container.firstChild).toHaveAttribute('data-bordered');
  });

  it('omits data-bordered when hasBorder is false', () => {
    const { container } = render(<FlyoutSubsection title="A">body</FlyoutSubsection>);
    expect(container.firstChild).not.toHaveAttribute('data-bordered');
  });
});

// ─── FlyoutAccordion ─────────────────────────────────────────────────────────

describe('FlyoutAccordion', () => {
  it('renders the title', () => {
    render(<FlyoutAccordion title="Advanced">content</FlyoutAccordion>);
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('honours data-test-subj on the EuiAccordion', () => {
    render(
      <FlyoutAccordion title="A" data-test-subj="myAccordion">
        content
      </FlyoutAccordion>
    );
    expect(screen.getByTestId('myAccordion')).toBeInTheDocument();
  });

  it('is closed by default and has no data-open attribute', () => {
    const { container } = render(<FlyoutAccordion title="A">content</FlyoutAccordion>);
    expect(container.firstChild).not.toHaveAttribute('data-open');
  });

  it('sets data-open on the wrapper when the accordion opens', async () => {
    const { container } = render(<FlyoutAccordion title="Details">content</FlyoutAccordion>);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(container.firstChild).toHaveAttribute('data-open');
  });

  it('removes data-open when the accordion closes', async () => {
    const { container } = render(<FlyoutAccordion title="Details">content</FlyoutAccordion>);
    const button = screen.getByRole('button');
    await userEvent.click(button); // open
    await userEvent.click(button); // close
    expect(container.firstChild).not.toHaveAttribute('data-open');
  });

  it('renders the action link', () => {
    render(
      <FlyoutAccordion title="A" action={{ label: 'View all', onClick: jest.fn() }}>
        content
      </FlyoutAccordion>
    );
    expect(screen.getByRole('button', { name: 'View all' })).toBeInTheDocument();
  });

  it('opens after flushing both animation frames when initialIsOpen is true', () => {
    jest.useFakeTimers();
    try {
      const { container } = render(
        <FlyoutAccordion title="Details" initialIsOpen>
          content
        </FlyoutAccordion>
      );
      expect(container.firstChild).not.toHaveAttribute('data-open');
      act(() => {
        jest.runAllTimers();
      });
      expect(container.firstChild).toHaveAttribute('data-open');
    } finally {
      jest.useRealTimers();
    }
  });
});
