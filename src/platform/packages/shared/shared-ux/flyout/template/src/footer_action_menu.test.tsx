/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { FlyoutTemplate } from './flyout_template';
import type { FlyoutFooterMenuPanel } from './types';

jest.mock('@elastic/apm-rum');

const noop = () => {};

// EUI sets pointer-events: none on the popover panel during its opening animation.
// jsdom never fires animationend, so this inline style is never cleared. Disable the
// check so clicks inside the popover work without waiting for an animation that never fires.
const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

const SIMPLE_PANELS: FlyoutFooterMenuPanel[] = [
  {
    id: 0,
    items: [
      { name: 'Action one', onClick: noop },
      { name: 'Action two', onClick: noop },
    ],
  },
];

const NESTED_PANELS: FlyoutFooterMenuPanel[] = [
  {
    id: 0,
    items: [
      { name: 'Top action', onClick: noop },
      { name: 'Open submenu', panel: 1 },
    ],
  },
  {
    id: 1,
    title: 'Submenu',
    items: [
      { name: 'Sub action A', onClick: noop },
      { name: 'Sub action B', onClick: noop },
    ],
  },
];

const SEPARATOR_PANELS: FlyoutFooterMenuPanel[] = [
  {
    id: 0,
    items: [
      { name: 'Group one item', onClick: noop },
      { isSeparator: true },
      { name: 'Group two item', onClick: noop },
    ],
  },
];

const renderWithMenu = (ui: React.ReactElement) => render(ui);

const renderMenu = (
  props: Partial<React.ComponentProps<typeof FlyoutTemplate.Footer.PrimaryActionMenu>> = {}
) =>
  renderWithMenu(
    <FlyoutTemplate onClose={noop} session="never" data-test-subj="flyout">
      <FlyoutTemplate.Body>
        <span>content</span>
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.PrimaryActionMenu
          label="Take action"
          panels={SIMPLE_PANELS}
          data-test-subj="takeAction"
          {...props}
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );

describe('FlyoutTemplate.Footer.PrimaryActionMenu', () => {
  it('renders the trigger as a filled button with the label and a down chevron; the menu is not open', () => {
    const { container } = renderMenu();

    const trigger = screen.getByRole('button', { name: /take action/i });
    expect(trigger).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click, exposes items as menuitems, and names the dialog', async () => {
    renderMenu();

    await user.click(screen.getByRole('button', { name: /take action/i }));

    expect(await screen.findByRole('dialog', { name: 'Take action menu' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Action one' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Action two' })).toBeInTheDocument();
  });

  it('flips the chevron to up while the menu is open and back to down on close', async () => {
    const { container } = renderMenu();

    const trigger = screen.getByRole('button', { name: /take action/i });
    await user.click(trigger);

    await screen.findByRole('dialog', { name: 'Take action menu' });
    expect(container.querySelector('[data-euiicon-type="chevronSingleUp"]')).toBeInTheDocument();

    await user.click(trigger);

    await waitFor(() => {
      expect(
        container.querySelector('[data-euiicon-type="chevronSingleDown"]')
      ).toBeInTheDocument();
    });
  });

  it('opens the dialog only after the trigger is clicked', async () => {
    renderMenu();

    // Before clicking: no dialog in the document.
    expect(screen.queryByRole('dialog', { name: 'Take action menu' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /take action/i }));

    // After clicking: dialog is present and named.
    expect(await screen.findByRole('dialog', { name: 'Take action menu' })).toBeInTheDocument();
  });

  it('clicking an item fires its onClick once and closes the menu', async () => {
    const onClick = jest.fn();
    const panels: FlyoutFooterMenuPanel[] = [{ id: 0, items: [{ name: 'Do it', onClick }] }];

    const { container } = renderMenu({ panels });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Do it' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    // EUI keeps the panel mounted during its close animation (jsdom never fires animationend).
    // Check the trigger chevron instead — it flips to "down" as soon as React state clears.
    expect(container.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();
  });

  it('closeOnItemClick={false} keeps the menu open after clicking an item', async () => {
    const onClick = jest.fn();
    const panels: FlyoutFooterMenuPanel[] = [{ id: 0, items: [{ name: 'Do it', onClick }] }];

    renderMenu({ panels, closeOnItemClick: false });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Do it' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Take action menu' })).toBeInTheDocument();
  });

  it('clicking an href item closes the menu', async () => {
    const panels: FlyoutFooterMenuPanel[] = [
      { id: 0, items: [{ name: 'Go there', href: 'https://example.com', target: '_blank' }] },
    ];

    const { container } = renderMenu({ panels });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: /go there/i }));

    expect(container.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();
  });

  it('clicking an item that opens a nested panel does not close the menu', async () => {
    renderMenu({ panels: NESTED_PANELS });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Open submenu' }));

    expect(await screen.findByRole('menuitem', { name: 'Sub action A' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Take action menu' })).toBeInTheDocument();
  });

  it('navigating into a nested panel shows its items and a back button', async () => {
    renderMenu({ panels: NESTED_PANELS });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Open submenu' }));

    expect(await screen.findByRole('menuitem', { name: 'Sub action A' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sub action B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close current panel/i })).toBeInTheDocument();
  });

  it('the back button returns to the parent panel', async () => {
    renderMenu({ panels: NESTED_PANELS });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Open submenu' }));

    const backButton = await screen.findByRole('button', { name: /close current panel/i });
    await user.click(backButton);

    expect(await screen.findByRole('menuitem', { name: 'Top action' })).toBeInTheDocument();
  });

  it('separators render and are not given an onClick wrapper', async () => {
    renderMenu({ panels: SEPARATOR_PANELS });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await screen.findByRole('menuitem', { name: 'Group one item' });

    expect(screen.getAllByRole('separator').length).toBeGreaterThanOrEqual(1);
  });

  it('initialPanelId defaults to panels[0].id', async () => {
    renderMenu();

    await user.click(screen.getByRole('button', { name: /take action/i }));

    expect(await screen.findByRole('menuitem', { name: 'Action one' })).toBeInTheDocument();
  });

  it('an explicit initialPanelId opens the specified panel', async () => {
    renderMenu({ panels: NESTED_PANELS, initialPanelId: 1 });

    await user.click(screen.getByRole('button', { name: /take action/i }));

    expect(await screen.findByRole('menuitem', { name: 'Sub action A' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Top action' })).not.toBeInTheDocument();
  });

  it('onPanelChange fires with the new panel id when a nested panel opens', async () => {
    const onPanelChange = jest.fn();

    renderMenu({ panels: NESTED_PANELS, onPanelChange });

    await user.click(screen.getByRole('button', { name: /take action/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'Open submenu' }));

    await screen.findByRole('menuitem', { name: 'Sub action A' });
    expect(onPanelChange).toHaveBeenCalledWith(expect.objectContaining({ panelId: 1 }));
  });

  it('a nested panel with no title warns in development; a titled one does not', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(noop);

    const untitledNestedPanels: FlyoutFooterMenuPanel[] = [
      {
        id: 0,
        items: [{ name: 'Go deeper', panel: 1 }],
      },
      {
        id: 1,
        // no title — should warn
        items: [{ name: 'Nested item', onClick: noop }],
      },
    ];

    renderMenu({ panels: untitledNestedPanels });
    await user.click(screen.getByRole('button', { name: /take action/i }));
    await screen.findByRole('menuitem', { name: 'Go deeper' });

    const titleWarns = warnSpy.mock.calls.filter((call) => String(call[0]).includes('no `title`'));
    expect(titleWarns.length).toBeGreaterThanOrEqual(1);

    warnSpy.mockRestore();
  });

  it('a titled nested panel does not trigger the title warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderMenu({ panels: NESTED_PANELS });
    await user.click(screen.getByRole('button', { name: /take action/i }));
    await screen.findByRole('menuitem', { name: 'Top action' });

    const titleWarns = warnSpy.mock.calls.filter((call) => String(call[0]).includes('no `title`'));
    expect(titleWarns.length).toBe(0);

    warnSpy.mockRestore();
  });

  it('reopening after navigating into a nested panel lands back on the initial panel', async () => {
    const { container } = renderMenu({ panels: NESTED_PANELS });

    const trigger = screen.getByRole('button', { name: /take action/i });

    // Open and navigate into the submenu.
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Open submenu' }));
    await screen.findByRole('menuitem', { name: 'Sub action A' });

    // Close: toggle the trigger. The chevron flips immediately as React state updates;
    // the panel stays in DOM during EUI's close animation (jsdom never fires animationend).
    await user.click(trigger);
    await waitFor(() => {
      expect(
        container.querySelector('[data-euiicon-type="chevronSingleDown"]')
      ).toBeInTheDocument();
    });

    // Reopen: key={openCount} forces EuiContextMenu to remount, resetting panel state.
    await user.click(trigger);
    expect(await screen.findByRole('menuitem', { name: 'Top action' })).toBeInTheDocument();
  });

  it('forwards arbitrary EuiButton and DOM props to the trigger', () => {
    renderMenu({
      id: 'takeActionButton',
      className: 'customClass',
      'data-ebt-target': 'footer',
      title: 'Open action menu',
    });

    const trigger = screen.getByRole('button', { name: /take action/i });
    expect(trigger).toHaveAttribute('id', 'takeActionButton');
    expect(trigger).toHaveClass('customClass');
    expect(trigger).toHaveAttribute('data-ebt-target', 'footer');
    expect(trigger).toHaveAttribute('data-test-subj', 'takeAction');
    expect(trigger).toHaveAttribute('title', 'Open action menu');
  });

  it('a consumer cannot override the trigger props the template owns', () => {
    // These are rejected by the type, so a JS caller is the only way in. The template
    // applies its own values after the spread, which is what keeps that guarantee honest.
    const owned = {
      fill: false,
      iconType: 'trash',
      iconSide: 'left',
      element: 'span',
      isSelected: true,
    } as Partial<React.ComponentProps<typeof FlyoutTemplate.Footer.PrimaryActionMenu>>;

    const { container } = renderMenu(owned);

    expect(container.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="trash"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take action/i }).className).toContain('fill');
    expect(screen.getByRole('button', { name: /take action/i }).tagName).toBe('BUTTON');
    expect(screen.getByRole('button', { name: /take action/i })).not.toHaveAttribute(
      'aria-pressed'
    );
  });

  it('the popover panel gets a derived data-test-subj', async () => {
    renderMenu();

    await user.click(screen.getByRole('button', { name: /take action/i }));

    expect(await screen.findByTestId('takeActionPanel')).toBeInTheDocument();
  });

  it('declaring both PrimaryAction and PrimaryActionMenu warns and renders only the menu', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderWithMenu(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={noop} />
          <FlyoutTemplate.Footer.PrimaryActionMenu label="Take action" panels={SIMPLE_PANELS} />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    const exclusivityWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('PrimaryAction')
    );
    expect(exclusivityWarns.length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take action/i })).toBeInTheDocument();

    warnSpy.mockRestore();
  });

  it('a panel with no items does not crash the flyout', async () => {
    // Reachable from JS callers and from annotating with EuiContextMenuPanelDescriptor[],
    // where `items` is optional.
    const panelsWithoutItems = [
      { id: 0, items: [{ name: 'Real item', onClick: noop }] },
      { id: 1, title: 'Content panel', content: <div>nope</div> },
    ] as unknown as FlyoutFooterMenuPanel[];

    renderMenu({ panels: panelsWithoutItems });
    await user.click(screen.getByRole('button', { name: /take action/i }));

    expect(await screen.findByRole('menuitem', { name: 'Real item' })).toBeInTheDocument();
    expect(screen.queryByText('nope')).not.toBeInTheDocument();
  });

  it('leaves a handler-less item as an inert div rather than a focusable button', async () => {
    const panels: FlyoutFooterMenuPanel[] = [
      {
        id: 0,
        items: [{ name: 'No actions available' }, { name: 'Real action', onClick: noop }],
      },
    ];

    renderMenu({ panels });
    await user.click(screen.getByRole('button', { name: /take action/i }));

    // EUI renders a row as a <button> only when it has a handler, href, or tooltip, and as an
    // inert <div> otherwise. It keeps role="menuitem" either way, so the element type is what
    // distinguishes a real action from a caption.
    expect(await screen.findByRole('menuitem', { name: 'Real action' })).toHaveProperty(
      'tagName',
      'BUTTON'
    );
    expect(screen.getByRole('menuitem', { name: 'No actions available' })).toHaveProperty(
      'tagName',
      'DIV'
    );
  });
});
