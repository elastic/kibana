/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { FlyoutTemplate } from './flyout_template';

const noop = () => {};

const renderTemplate = (ui: React.ReactElement) => render(ui);

describe('FlyoutTemplate footer', () => {
  it('renders the primary action to the right of the secondary action', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="withFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.SecondaryAction label="Discard" onClick={noop} />
          <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={noop} />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    const footer = screen.getByTestId('withFooterFooter');
    const text = footer.textContent ?? '';
    expect(text.indexOf('Discard')).toBeLessThan(text.indexOf('Save'));
    expect(within(footer).getByText('Save')).toBeInTheDocument();
    expect(within(footer).getByText('Discard')).toBeInTheDocument();
  });

  it('does not render a footer when it has no actions, and adds no default Cancel button', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="noFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer />
      </FlyoutTemplate>
    );

    expect(screen.queryByTestId('noFooterFooter')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('forwards a custom data attribute and an EuiButton prop through PrimaryAction', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="withFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryAction
            label="Save"
            onClick={noop}
            data-foo="primaryFoo"
            data-test-subj="primarySave"
            contentProps={{ 'data-test-subj': 'primaryContent' }}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('primarySave')).toHaveAttribute('data-foo', 'primaryFoo');
    expect(screen.getByTestId('primaryContent')).toBeInTheDocument();
  });

  it('forwards a custom data attribute and an EuiButtonEmpty prop through SecondaryAction', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="withFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.SecondaryAction
            label="Discard"
            onClick={noop}
            data-foo="secondaryFoo"
            data-test-subj="secondaryDiscard"
            textProps={{ 'data-test-subj': 'secondaryText' }}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('secondaryDiscard')).toHaveAttribute('data-foo', 'secondaryFoo');
    expect(screen.getByTestId('secondaryText')).toBeInTheDocument();
  });

  it('renders the menu trigger to the right of the secondary action', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="menuFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.SecondaryAction label="Cancel" onClick={noop} />
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label="Take action"
            panels={[{ id: 0, items: [{ name: 'Do it', onClick: noop }] }]}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    const footer = screen.getByTestId('menuFooterFooter');
    const text = footer.textContent ?? '';
    expect(text.indexOf('Cancel')).toBeLessThan(text.indexOf('Take action'));
  });

  it('omits the footer when a menu with empty panels is the only action', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="emptyMenu">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryActionMenu label="Take action" panels={[]} />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    expect(screen.queryByTestId('emptyMenuFooter')).not.toBeInTheDocument();
  });

  it('a menu with empty panels alongside a PrimaryAction renders the PrimaryAction without warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={noop} />
          <FlyoutTemplate.Footer.PrimaryActionMenu label="Take action" panels={[]} />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    const exclusivityWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('PrimaryAction')
    );
    expect(exclusivityWarns.length).toBe(0);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    warnSpy.mockRestore();
  });
});
