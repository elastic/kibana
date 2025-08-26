/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('Expanded mode', () => {
  describe('Solution logo', () => {
    /**
     * GIVEN the side navigation is in expanded mode
     * WHEN the navigation renders the solution logo
     * THEN I should see the solution label
     */
    it.todo('should display the solution label next to the logo');
  });

  describe('Primary menu', () => {
    describe('Primary menu item', () => {
      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I hover over it
       * THEN I should see a popover with the submenu
       */
      it.todo('(with submenu) should show a popover with the submenu on hover (with submenu)');

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item with a submenu is in an active state
       * WHEN I hover over it
       * THEN a popover with the submenu should not be displayed
       */
      it.todo(
        '(with submenu) should NOT show a popover if the item with submenu is already active'
      );

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I click on it
       * THEN I should be redirected to its href
       * AND a side panel with the submenu should show
       */
      it.todo('(with submenu) should redirect and open side panel when clicking item with submenu');

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item with a submenu has focus
       * WHEN I press the Enter key
       * THEN focus should move to the popover
       */
      it.todo('(with submenu) should move focus to popover on Enter when focused item has submenu');

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I hover over it
       * THEN I should not see a popover
       */
      it.todo('(without submenu) should NOT show a popover on hover (without submenu)');

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I click on it
       * THEN I should be redirected to its href
       * AND I should not see a side panel
       */
      it.todo(
        '(without submenu) should redirect and NOT open side panel when clicking item without submenu'
      );

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item without a submenu has focus
       * WHEN I press the Enter key
       * THEN I should be redirected to its href
       */
      it.todo('(without submenu) should redirect on Enter when focused item has no submenu');
    });

    describe('More menu', () => {
      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN the navigation renders
       * THEN I should see a "More" primary menu item
       */
      it.todo('should render the "More" primary menu item when items overflow');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * THEN I should see a popover with secondary menu
       */
      it.todo('should show popover with secondary menu on hover over "More"');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that has a submenu
       * THEN I should see a side panel with that submenu
       */
      it.todo('should open side panel when clicking submenu item inside "More" popover');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that doesn’t have a submenu
       * THEN I shouldn’t see a side panel
       */
      it.todo('should NOT open side panel when clicking item without submenu in "More" popover');

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that has a submenu
       * THEN the popover should close
       * AND I should be redirected to that item’s href
       * AND I should a side panel should show with that submenu
       */
      it.todo(
        'should close popover, redirect, and open side panel after clicking on an item with submenu from "More"'
      );

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
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
       * GIVEN the navigation renders in expanded mode
       * AND not all primary menu items fit the menu height
       * AND the initial active item is a submenu item of an item in the "More" menu
       * WHEN the navigation renders
       * THEN the "More" primary menu item itself is in an active state
       * AND its parent primary menu item is active within the "More" menu popover
       * AND a side panel with the submenu opens
       * AND the submenu item is in an active state
       */
      it.todo(
        'should have active state and open side panel when initial active submenu item is under "More"'
      );
    });
  });

  describe('Secondary menu', () => {
    describe('Beta badge', () => {
      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item is in beta
       * WHEN I hover over that item
       * THEN a tooltip shows up with "Beta" text
       * AND a beta badge with beta icon
       */
      it.todo('should show tooltip with "Beta" and beta badge on hover');
    });

    describe('Tech preview badge', () => {
      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item is in tech preview
       * WHEN I hover over that item
       * THEN a tooltip shows up with "Tech preview" text
       * AND a beta badge with flask icon
       */
      it.todo('should show tooltip with "Tech preview" and flask badge on hover');
    });
  });
});
