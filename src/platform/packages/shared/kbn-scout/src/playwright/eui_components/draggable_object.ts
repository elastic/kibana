/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseObject, type ObjectScope } from '@elastic/eui-test-helpers';
import { expect } from '@playwright/test';

/**
 * Playwright Component Object for a keyboard-reorderable
 * {@link https://eui.elastic.co/docs/components/drag-and-drop/ EuiDraggable}
 * item.
 *
 * Prototype for `@elastic/eui-test-helpers` (see the package CONTRIBUTING guide);
 * lives in kbn-scout until it is ported and published.
 *
 * `testSubj` must be set on the item's own drag handle (the element EUI's
 * `provided.dragHandleProps` are spread onto), not on the `EuiDraggable` item
 * wrapper — that's what every current consumer already renders a handle
 * `data-test-subj` for. No `componentSelector` is enforced: the handle is
 * consumer-markup (often a button or icon), not a fixed EUI element.
 */
export class EuiDraggableObject extends BaseObject {
  constructor(scope: ObjectScope, testSubj: string) {
    super(scope, testSubj);
  }

  /**
   * Reorders the item via keyboard: focus the handle, lift it (`Space`),
   * move it `steps` positions (`ArrowDown` for positive, `ArrowUp` for
   * negative), drop it (`Space`), then wait for EUI's own
   * `euiDraggable--isDragging` class to clear on the ancestor draggable item
   * — the reliable signal the reorder has settled.
   *
   * Keyboard lift is used deliberately instead of simulating a mouse drag:
   * it's what `@hello-pangea/dnd` (which `EuiDraggable` wraps) itself
   * supports as an accessible interaction, and it's what every current
   * consumer already drives it with.
   */
  async reorder(steps: number): Promise<void> {
    await this.root.focus();
    await this.root.press('Space');
    const key = steps > 0 ? 'ArrowDown' : 'ArrowUp';
    for (let i = 0; i < Math.abs(steps); i++) {
      await this.root.press(key);
    }
    await this.root.press('Space');

    const draggableItem = this.root.locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " euiDraggable ")][1]'
    );
    await expect(draggableItem).not.toHaveClass(/euiDraggable--isDragging/);
  }
}
