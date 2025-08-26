/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('Collapsed mode', () => {
  describe('Solution logo', () => {
    /**
     * GIVEN the side navigation is in collapsed mode
     * WHEN the navigation renders the solution logo
     * THEN I should not see the solution label
     */
    it.todo('should NOT display the solution label next to the logo');

    /**
     * GIVEN the side navigation is in collapsed mode
     * WHEN I hover over the solution logo
     * THEN a tooltip appears with the item label
     * AND when I click on the trigger
     * AND then I hover out
     * THEN the tooltip disappears
     */
    // Even after clicking on the trigger which makes the `EuiToolTip` persistent by default
    // See: https://eui.elastic.co/docs/components/display/tooltip/
    it.todo('should display a tooltip with the solution label on hover, and hide on hover out');
  });

  describe('Primary menu', () => {
    describe('Primary menu item', () => {
      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I hover over it
       * THEN I should see a popover with the submenu
       */
      it.todo('(with submenu) should show a popover with the submenu on hover');

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item with a submenu receives keyboard focus
       * THEN I should see a popover with the submenu
       */
      it.todo(
        '(with submenu) should show a popover when item with submenu receives keyboard focus'
      );

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I click on it
       * THEN I should be redirected to its href
       * AND I should not see a side panel
       */
      it.todo('(with submenu) should redirect and NOT open side panel when clicking item');

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item with a submenu has focus
       * WHEN I press the Enter key
       * THEN focus moves to the first item inside the displayed popover
       */
      it.todo('(with submenu) should move focus to first popover item on Enter');

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I hover over it
       * THEN I should not see a popover
       */
      it.todo('(without submenu) should NOT show a popover on hover');

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I click on it
       * THEN I should be redirected to its href
       * AND I should not see a side panel
       */
      it.todo(
        '(without submenu) should redirect without side panel when clicking item without submenu'
      );

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item without a submenu has focus
       * WHEN I press the Enter key
       * THEN I should be redirected to its href
       */
      it.todo('(without submenu) should redirect on Enter when focused item has no submenu');

      /**
       * GIVEN the side navigation is in collapsed mode
       * WHEN I hover over a primary menu item
       * THEN a tooltip appears with the item label
       * AND when I click on the trigger
       * AND then I hover out
       * THEN the tooltip disappears
       */
      // Even after clicking on the trigger which makes the `EuiToolTip` persistent by default
      // See: https://eui.elastic.co/docs/components/display/tooltip/
      it.todo('should display a tooltip with the solution label on hover, and hide on hover out');
    });

    describe('More menu', () => {
      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN the navigation renders
       * THEN I should see a "More" primary menu item
       */
      it.todo('should render the "More" primary menu item when items overflow');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN I hover over the "More" primary menu item
       * THEN I should see a popover with secondary menu
       */
      it.todo('should show secondary menu popover on hover over "More"');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the arrow next to the item that has a submenu
       * THEN the nested panel shows with the submenu
       * AND when I click on a submenu item
       * THEN the popover should close
       * AND I should be redirected to that item’s href
       * AND I shouldn’t see a side panel
       */
      it.todo('should navigate through nested panel and redirect on clicking a submenu item');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that doesn’t have a submenu
       * THEN the popover should close
       * AND I should be redirected to that item’s href
       * AND I shouldn’t see a side panel
       */
      it.todo(
        'should close popover, redirect, and NOT open side panel after clicking on an item without submenu from "More"'
      );

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * AND the initial active item is a submenu item of an item in the "More" menu
       * WHEN the navigation renders in collapsed mode
       * THEN the "More" primary menu item itself is in an active state
       * AND its parent primary menu item is active within the "More" menu popover
       * AND there is no side panel
       * AND the submenu item is active in its nested panel within the popover
       */
      it.todo(
        'should have active state and NOT open side panel when initial active submenu item is under "More"'
      );
    });
  });

  describe('Secondary menu', () => {
    describe('Beta badge', () => {
      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item is in beta
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with beta icon
       */
      it.todo('should show tooltip with label and beta badge on hover');
    });

    describe('Tech preview badge', () => {
      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item is in tech preview
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with flask icon
       */
      it.todo('should show tooltip with label and flask badge on hover');
    });
  });
});
