/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('Both modes', () => {
  it.todo('should render the side navigation');

  describe('Solution logo', () => {
    /**
     * GIVEN the solution logo is displayed in the navigation
     * WHEN I click the solution logo
     * THEN I should be redirected to the solution’s homepage
     */
    it.todo('should redirect to the solution homepage when clicked');

    /**
     * GIVEN the current page is the solution’s homepage
     * WHEN the navigation renders
     * THEN the solution logo is in an active state
     */
    it.todo('should have active state if the initial active item is the homepage');
  });

  describe('Responsive mode', () => {
    /**
     * GIVEN the screen size is less than `s` (767px)
     * WHEN the navigation renders
     * THEN it shows in collapsed mode
     */
    it.todo('should render in collapsed mode if the screen size is less than `s` (767px)');

    /**
     * GIVEN the screen size is less than `s` (767px)
     * WHEN I resize the window to be larger
     * THEN the navigation should be in expanded mode
     */
    it.todo(
      'should render in expanded mode if the screen size is less than `s` (767px) and I resize the window to be larger'
    );

    /**
     * GIVEN the screen size is more or equal to `s` (767px)
     * WHEN the navigation renders
     * THEN the navigation should be in expanded mode
     */
    it.todo('should render in expanded mode if the screen size is more or equal to `s` (767px)');
  });

  describe('Primary menu', () => {
    describe('Primary menu item', () => {
      /**
       * GIVEN the initial active item is a primary menu item
       * WHEN the navigation renders
       * THEN this primary menu item is in an active state
       */
      it.todo('should have active state if the initial active item is the primary menu item');

      /**
       * GIVEN the initial active item is a submenu item
       * WHEN the navigation renders
       * THEN its parent primary menu item is in an active state
       * AND a side panel with the submenu opens
       * AND the submenu item is in an active state
       */
      it.todo('should have active state if the initial active item is the submenu item');

      /**
       * GIVEN a primary menu item without a submenu is not active
       * WHEN I click on it
       * THEN this primary menu item becomes active
       */
      it.todo('(without submenu) should have active state after clicking on it');

      /**
       * GIVEN a primary menu item with a submenu is not active
       * WHEN I click on it
       * THEN the primary menu item becomes active
       * AND a side panel with its submenu opens
       * AND the first item in the submenu is in an active state by default
       */
      it.todo(
        '(with submenu) should have active state after clicking on it, and a side panel should open'
      );

      /**
       * GIVEN a primary menu item with a submenu is active
       * WHEN I click on a different item in its submenu
       * THEN the parent primary menu item remains in an active state
       * AND the clicked submenu item becomes active
       */
      it.todo(
        '(with submenu) should still have active state after clicking on another submenu item'
      );
    });

    describe('Primary menu item limit', () => {
      /**
       * GIVEN fewer than 11 primary menu items exist (e.g. 10)
       * WHEN the navigation renders
       * THEN all provided items are displayed
       */
      it.todo('should display all provided items when fewer than 11 exist');

      /**
       * GIVEN exactly 11 primary menu items exist
       * WHEN the navigation renders
       * THEN all provided items are displayed
       */
      it.todo('should display all 11 provided items when exactly 11 exist');

      /**
       * GIVEN more than 11 primary menu items exist (e.g. 12)
       * WHEN the navigation renders
       * THEN only 10 of those primary menu items display
       * AND a "More" menu item displays
       * AND it has a submenu with the 1 primary menu item left
       */
      it.todo('should display a "More" menu item with a submenu when more than 11 exist');
    });

    describe('More menu', () => {
      /**
       * GIVEN not all primary menu items fit the menu height
       * WHEN I click on the "More" primary menu
       * THEN a popover should appear with the submenu
       * AND when I hover out the popover should persist
       */
      it.todo('should have persistent popover on hover out after the trigger was clicked');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the initial active item is a primary menu item within the "More" menu
       * WHEN the navigation renders
       * THEN the "More" primary menu item itself is in an active state
       */
      it.todo('should have active state if the initial active item is the "More" menu item');
    });
  });

  describe('Footer', () => {
    describe('Footer item', () => {
      /**
       * GIVEN the initial active item is a footer item
       * WHEN the navigation renders
       * THEN this footer item is in an active state
       */
      it.todo('should have active state if the initial active item is the footer item');

      /**
       * GIVEN the initial active item is a footer submenu item
       * WHEN the navigation renders
       * THEN its parent footer item is in an active state
       * AND a side panel with the submenu opens
       * AND the footer submenu item is in an active state
       */
      it.todo('should have active state if the initial active item is the footer submenu item');

      /**
       * GIVEN a footer item with a submenu is not active
       * WHEN I click on it
       * THEN the footer item becomes active
       * AND a side panel with its submenu opens
       * AND the first item in the submenu is in an active state by default
       */
      it.todo(
        '(with submenu) should have active state after clicking on it, and a side panel should open'
      );

      /**
       * GIVEN a footer item with a submenu is active
       * WHEN I click on a different item in its submenu
       * THEN the parent footer item remains in an active state
       * AND the clicked submenu item becomes active
       */
      it.todo(
        '(with submenu) should still have active state after clicking on another submenu item'
      );

      /**
       * GIVEN there are footer items
       * WHEN I hover over a footer item
       * THEN a tooltip appears with the item label
       * AND when I click on the trigger
       * AND then I hover out
       * THEN the tooltip disappears
       */
      // Even after clicking on the trigger which makes the `EuiToolTip` persistent by default
      // See: https://eui.elastic.co/docs/components/display/tooltip/
      it.todo('should display a tooltip with the item label on hover, and hide on hover out');
    });

    describe('Footer item limit', () => {
      /**
       * GIVEN fewer than 5 footer items exist
       * WHEN the navigation renders
       * THEN all existing footer items are displayed
       */
      it.todo('should display all existing footer items if fewer than 5 exist');

      /**
       * GIVEN exactly 5 footer items exist
       * WHEN the navigation renders
       * THEN all 5 items are displayed
       */
      it.todo('should display all 5 footer items if exactly 5 exist');

      /**
       * GIVEN 6 footer items exist
       * WHEN the navigation renders
       * THEN only 5 footer items are displayed
       */
      it.todo('should display only 5 footer items if 6 or more exist');
    });

    describe('Beta badge', () => {
      /**
       * GIVEN a footer item is in beta
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with beta icon
       */
      it.todo('should render a tooltip with the item label and a beta badge with beta icon');
    });

    describe('Tech preview badge', () => {
      /**
       * GIVEN a footer item is in tech preview
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with flask icon
       */
      it.todo('should render a tooltip with the item label and a beta badge with flask icon');
    });
  });

  describe('Secondary menu', () => {
    describe('Beta badge', () => {
      /**
       * GIVEN a primary menu item is in beta
       * WHEN the navigation renders the secondary menu header
       * THEN a beta badge with beta icon appears next to the menu title
       */
      it.todo('should render a beta badge with beta icon next to the menu title');

      /**
       * GIVEN a menu item is in beta
       * WHEN the navigation renders the secondary menu items
       * THEN a beta badge with beta icon appears next to the menu item label
       */
      it.todo('should render a beta badge with beta icon next to the menu item label');
    });

    describe('Tech preview badge', () => {
      /**
       * GIVEN a primary menu item is in tech preview
       * WHEN the navigation renders the secondary menu header
       * THEN a beta badge with flask icon appears next to the menu title
       */
      it.todo('should render a beta badge with flask icon next to the menu title');

      /**
       * GIVEN a menu item is in tech preview
       * WHEN the navigation renders the secondary menu items
       * THEN a beta badge with flask icon appears next to the menu item label
       */
      it.todo('should render a beta badge with flask icon next to the menu item label');
    });

    describe('External links', () => {
      /**
       * GIVEN a menu item is an external link
       * WHEN the navigation renders the menu item
       * THEN a popout icon is displayed next to the link text
       */
      it.todo('should render a popout icon next to the link text');

      /**
       * GIVEN a menu item is an external link
       * WHEN I click on the link
       * THEN it is opened in a new tab
       */
      it.todo('should open the link in a new tab');
    });
  });

  describe('Keyboard navigation', () => {
    /**
     * GIVEN focus is on any menu item within a menu (primary, footer, or submenu)
     * WHEN I press the Arrow Down or Arrow Up key
     * THEN focus moves to the next or previous item in that menu, respectively
     */
    it.todo(
      'should move focus to the next or previous item in the menu when pressing Arrow Down or Arrow Up'
    );

    /**
     * GIVEN focus is on any menu item within a menu (primary, footer, or submenu)
     * AND I am navigating with a keyboard
     * WHEN I repeatedly press the Tab key
     * THEN focus moves sequentially through the primary menu, the footer menu, and the side panel (if open), before moving to the main page content
     */
    it.todo('should move focus through all navigable menus when pressing Tab');

    /**
     * GIVEN I am navigating with a keyboard
     * AND focus is in the primary menu, the footer menu, the popover or the side panel
     * WHEN I press the Home or End key
     * THEN focus moves to the first or last item in that menu, respectively
     */
    it.todo('should move focus to the first or last item in the menu when pressing Home or End');

    /**
     * GIVEN focus is inside an open popover
     * WHEN I repeatedly press the Tab or Shift + Tab key
     * THEN focus cycles only through the interactive elements within that container and does not leave it
     */
    it.todo(
      'should cycle focus through interactive elements in the popover when pressing Tab or Shift + Tab'
    );

    /**
     * GIVEN the focus is inside the popover
     * WHEN I press the Escape key
     * THEN the popover closes
     * AND focus returns to the menu item that originally opened it
     */
    it.todo('should return focus to the menu item that opened the popover when it is closed');
  });
});
