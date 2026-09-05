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
import { FlyoutTemplate } from './flyout_template';
import { bodyAssembly } from './assembly';

jest.mock('@elastic/apm-rum');

const noop = () => {};

const renderTemplate = (ui: React.ReactElement) => render(ui);

const ThrowOnRender = () => {
  throw new Error('intentional render error');
};

describe('FlyoutTemplate body', () => {
  it('catches a throwing body child and shows the error fallback without crashing the flyout', () => {
    jest.spyOn(console, 'error').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="myFlyout">
        <FlyoutTemplate.Header title="Service inventory" />
        <FlyoutTemplate.Body>
          <ThrowOnRender />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('errorBoundaryFatalHeader')).toBeInTheDocument();
    expect(screen.getByTestId('myFlyoutHeader')).toBeInTheDocument();
    jest.restoreAllMocks();
  });

  it('warns in development when the body zone is missing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="No body here" />
      </FlyoutTemplate>
    );

    expect(warn).toHaveBeenCalledWith('[FlyoutTemplate] A <FlyoutTemplate.Body> is required.');
    warn.mockRestore();
  });

  it('renders section titles as H4', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Summary">content</FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('heading', { level: 4, name: 'Summary' })).toBeInTheDocument();
  });

  it('renders a divider between sections, none after the last', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="One">one</FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Section title="Two">two</FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Section title="Three">three</FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // Three adjacent sections with data-flyout-section; CSS draws rules between non-bordered siblings.
    const sections = container.querySelectorAll('[data-flyout-section="section"]');
    expect(sections).toHaveLength(3);
    sections.forEach((s) => expect(s).not.toHaveAttribute('data-bordered'));
  });

  it('renders no divider for a single section', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Summary">content</FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // A single section has no preceding sibling, so the CSS selector never fires.
    const sections = container.querySelectorAll('[data-flyout-section="section"]');
    expect(sections).toHaveLength(1);
    expect(sections[0]).not.toHaveAttribute('data-bordered');
  });

  it('renders unstructured body content with no title, outline, or divider', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <div data-test-subj="filterBar">filter bar</div>
          <div data-test-subj="dataGrid">data grid</div>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('filterBar')).toBeInTheDocument();
    expect(screen.getByText('data grid')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('filter bar').closest('.euiPanel')).toBeNull();
    expect(container.querySelectorAll('[data-flyout-section]')).toHaveLength(0);
  });

  it('interleaved unstructured content breaks section adjacency', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="One">one</FlyoutTemplate.Body.Section>
          <div>filter bar</div>
          <FlyoutTemplate.Body.Section title="Two">two</FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('heading', { level: 4, name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Two' })).toBeInTheDocument();
    expect(screen.getByText('filter bar')).toBeInTheDocument();
    // The div between the sections breaks the CSS adjacent-sibling selector, so only one
    // data-flyout-section follows another directly — Two has no preceding section sibling.
    expect(container.querySelectorAll('[data-flyout-section]')).toHaveLength(2);
  });

  it('does not wrap section content in an outlined box by default', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Summary">
            <span>plain content</span>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByText('plain content').closest('.euiPanel')).toBeNull();
  });

  it('wraps section content in an outlined box when hasBorder is set', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Summary" hasBorder>
            <span>boxed content</span>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const panel = screen.getByText('boxed content').closest('.euiPanel');
    expect(panel).toBeInTheDocument();
    // The box wraps only the content; the title stays outside it (same as Accordion).
    expect(panel).not.toContainElement(screen.getByRole('heading', { level: 4, name: 'Summary' }));
  });

  it('renders a section icon next to the title', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Summary" icon="info">
            content
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(container.querySelector('[data-euiicon-type="info"]')).toBeInTheDocument();
  });

  it('renders a section action link on the title row', async () => {
    const onClick = jest.fn();
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Summary" action={{ label: 'Extra action', onClick }}>
            content
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const link = screen.getByRole('button', { name: 'Extra action' });
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalled();
  });

  it('forwards a section id to the DOM and names the section region', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section id="summary" title="Summary" data-test-subj="mySection">
            body
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const section = screen.getByTestId('mySection');
    expect(section).toHaveAttribute('id', 'summary');
    expect(screen.getByRole('region', { name: 'Summary' })).toBe(section);
  });

  it('preserves JSX order between sections and passthrough children in the body', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="ordered">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="First">
            <span>first section</span>
          </FlyoutTemplate.Body.Section>
          <div>passthrough</div>
          <FlyoutTemplate.Body.Section title="Second">
            <span>second section</span>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const body = screen.getByTestId('orderedBody');
    const text = body.textContent ?? '';
    expect(text.indexOf('first section')).toBeLessThan(text.indexOf('passthrough'));
    expect(text.indexOf('passthrough')).toBeLessThan(text.indexOf('second section'));
  });
});

describe('FlyoutTemplate body accordions', () => {
  it('wraps only the accordion content in an outlined box, not the title', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="Overview" initialIsOpen>
            <span>overview content</span>
          </FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const title = screen.getByRole('button', { name: /Overview/ });
    expect(title).toBeInTheDocument();
    // Content is wrapped in an outlined box; the title stays outside it.
    const panel = screen.getByText('overview content').closest('.euiPanel');
    expect(panel).toBeInTheDocument();
    expect(panel).not.toContainElement(title);
  });

  it('renders a divider below each closed accordion except the last', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="One">one</FlyoutTemplate.Body.Accordion>
          <FlyoutTemplate.Body.Accordion title="Two">two</FlyoutTemplate.Body.Accordion>
          <FlyoutTemplate.Body.Accordion title="Three">three</FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // Three closed accordions; CSS draws rules between adjacent non-open siblings.
    const accordions = container.querySelectorAll('[data-flyout-section="accordion"]');
    expect(accordions).toHaveLength(3);
    accordions.forEach((a) => expect(a).not.toHaveAttribute('data-open'));
  });

  it('hides the divider below an accordion while it is open', async () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="One">one</FlyoutTemplate.Body.Accordion>
          <FlyoutTemplate.Body.Accordion title="Two">two</FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // Both closed initially.
    const accordions = container.querySelectorAll('[data-flyout-section="accordion"]');
    expect(accordions[0]).not.toHaveAttribute('data-open');

    // Opening the first accordion sets data-open, which suppresses the rule above the next sibling.
    await userEvent.click(screen.getByRole('button', { name: /One/ }));
    expect(accordions[0]).toHaveAttribute('data-open');
    expect(accordions[1]).not.toHaveAttribute('data-open');
  });

  it('toggles the accordion open on click', async () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="Overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const button = screen.getByRole('button', { name: /Overview/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders an accordion action as the extra action', async () => {
    const onClick = jest.fn();
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion
            title="Overview"
            action={{ label: 'Extra action', onClick }}
          >
            content
          </FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Extra action' }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('FlyoutTemplate body subsections', () => {
  it('renders subsection titles as H5 inside a Section', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Overview">
            <FlyoutTemplate.Body.Section.Subsection title="Host">
              <span>host content</span>
            </FlyoutTemplate.Body.Section.Subsection>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('heading', { level: 4, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Host' })).toBeInTheDocument();
    expect(screen.getByText('host content')).toBeInTheDocument();
  });

  it('separates Section subsections with CSS rules driven by data attributes', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Overview">
            <FlyoutTemplate.Body.Section.Subsection title="One">
              one
            </FlyoutTemplate.Body.Section.Subsection>
            <FlyoutTemplate.Body.Section.Subsection title="Two">
              two
            </FlyoutTemplate.Body.Section.Subsection>
            <FlyoutTemplate.Body.Section.Subsection title="Three">
              three
            </FlyoutTemplate.Body.Section.Subsection>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('heading', { level: 5, name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Two' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Three' })).toBeInTheDocument();
  });

  it('does not wrap Section subsections in an outer bordered box', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Overview">
            <FlyoutTemplate.Body.Section.Subsection title="Host">
              <span>host content</span>
            </FlyoutTemplate.Body.Section.Subsection>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // Content should NOT be inside an EuiPanel box in the section context.
    expect(screen.getByText('host content').closest('.euiPanel')).toBeNull();
  });

  it('renders Accordion subsections each in their own outlined box', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="Overview" initialIsOpen>
            <FlyoutTemplate.Body.Accordion.Subsection title="Host">
              <span>host content</span>
            </FlyoutTemplate.Body.Accordion.Subsection>
            <FlyoutTemplate.Body.Accordion.Subsection title="Process">
              <span>process content</span>
            </FlyoutTemplate.Body.Accordion.Subsection>
          </FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // Each subsection in its own EuiPanel box.
    expect(screen.getByText('host content').closest('.euiPanel')).toBeInTheDocument();
    expect(screen.getByText('process content').closest('.euiPanel')).toBeInTheDocument();
    // The two panels are siblings, not nested.
    const hostPanel = screen.getByText('host content').closest('.euiPanel')!;
    const processPanel = screen.getByText('process content').closest('.euiPanel')!;
    expect(hostPanel).not.toContainElement(processPanel as HTMLElement);
  });

  it('renders Accordion subsections without horizontal rules between them', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="Overview" initialIsOpen>
            <FlyoutTemplate.Body.Accordion.Subsection title="One">
              one
            </FlyoutTemplate.Body.Accordion.Subsection>
            <FlyoutTemplate.Body.Accordion.Subsection title="Two">
              two
            </FlyoutTemplate.Body.Accordion.Subsection>
          </FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const borderedSubsections = container.querySelectorAll('[data-bordered]');
    expect(borderedSubsections).toHaveLength(2);
  });

  it('renders subsection titles as H5 inside an Accordion', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Accordion title="Overview" initialIsOpen>
            <FlyoutTemplate.Body.Accordion.Subsection title="Host">
              host content
            </FlyoutTemplate.Body.Accordion.Subsection>
          </FlyoutTemplate.Body.Accordion>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('heading', { level: 5, name: 'Host' })).toBeInTheDocument();
  });

  it('forwards a subsection id to its wrapper', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Overview">
            <FlyoutTemplate.Body.Section.Subsection
              id="host"
              title="Host"
              data-test-subj="mySubsection"
            >
              host
            </FlyoutTemplate.Body.Section.Subsection>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('mySubsection')).toHaveAttribute('id', 'host');
  });

  it('keeps a bordered section marked as bordered when it holds subsections', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title="Overview" hasBorder data-test-subj="mySection">
            <FlyoutTemplate.Body.Section.Subsection title="Host" data-test-subj="mySubsection">
              host
            </FlyoutTemplate.Body.Section.Subsection>
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    // The box lands on the subsection, but the section still reports itself as bordered so the
    // next section does not draw a divider above itself.
    expect(screen.getByTestId('mySection')).toHaveAttribute('data-bordered');
    expect(screen.getByTestId('mySubsection')).toHaveAttribute('data-bordered');
  });

  it('exposes Subsection only through Section and Accordion', () => {
    expect('Subsection' in FlyoutTemplate.Body).toBe(false);
    expect(FlyoutTemplate.Body.Section.Subsection).toBe(FlyoutTemplate.Body.Accordion.Subsection);
  });

  // The root parses the body's children for its tab-panel state and hands the result down.
  // Parsing again in the zone or the renderer would repeat every assembly warning per pass.
  it("parses the body children once, reusing the root's parse", () => {
    const parseChildren = jest.spyOn(bodyAssembly, 'parseChildren');
    const marker = <span>content</span>;

    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Service inventory" />
        <FlyoutTemplate.Body>
          {marker}
          <FlyoutTemplate.Body.Section title="Summary">inner</FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const bodyChildParses = parseChildren.mock.calls.filter(([children]) =>
      Array.isArray(children) ? children.includes(marker) : false
    );
    expect(bodyChildParses).toHaveLength(1);

    parseChildren.mockRestore();
  });
});
